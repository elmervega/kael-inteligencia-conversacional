# Dashboard SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-featured SaaS dashboard for kael.quest where each registered user can configure their Kael, view conversation history, and manage reminders — plus a dashboard preview section on the landing page.

**Architecture:** Server components fetch data at the route level; client components handle interactivity (forms, navigation). `conversation_memory` and `reminders` tables are queried via `prisma.$queryRaw` since they are managed by n8n. New `UserPreferences` model added to Prisma for user configuration. Sidebar is a persistent client component wrapping all dashboard routes via `app/dashboard/layout.tsx`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, Framer Motion, NextAuth v5

---

## File Map

```
New:
  prisma/schema.prisma                          (modified)
  app/dashboard/layout.tsx                      (dashboard shell — server, renders sidebar)
  app/dashboard/page.tsx                        (home — server, redesigned)
  app/dashboard/conversations/page.tsx          (full history — server)
  app/dashboard/reminders/page.tsx              (reminders management — server + client)
  app/dashboard/settings/page.tsx               (config standalone — server + client)
  app/dashboard/plan/page.tsx                   (plan info — static)
  app/api/preferences/route.ts                  (GET + PUT user preferences)
  app/api/conversations/route.ts                (GET paginated conversations)
  app/api/reminders/route.ts                    (GET + POST + DELETE reminders)
  components/dashboard/Sidebar.tsx              (nav sidebar — client)
  components/dashboard/KaelConfigForm.tsx       (preferences form — client)
  components/dashboard/ConversationsPreview.tsx (last 2 messages — client)
  components/dashboard/RemindersPreview.tsx     (next 3 reminders — client)

Modified:
  app/page.tsx          (add dashboard preview section before PRICING)
```

---

## Task 1: Prisma Schema — Add UserPreferences + telegramChatId

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to schema**

In `prisma/schema.prisma`, replace the `User` model and add `UserPreferences`:

```prisma
model User {
  id             String           @id @default(cuid())
  name           String?
  email          String           @unique
  password       String?
  plan           String           @default("free")
  telegramChatId String?
  createdAt      DateTime         @default(now())
  accounts       Account[]
  sessions       Session[]
  preferences    UserPreferences?
}

model UserPreferences {
  id                String @id @default(cuid())
  userId            String @unique
  kaelName          String @default("")
  language          String @default("es")
  tone              String @default("motivacional")
  customInstruction String @default("")
  user              User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Generate and apply migration locally**

```bash
cd kael-web
npx prisma migrate dev --name add-user-preferences
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been created and applied from new schema changes:
migrations/20260404_add_user_preferences/migration.sql
```

- [ ] **Step 3: Apply migration on production server**

```bash
ssh -i ~/.ssh/kael_server root@165.22.232.160 \
  "cd /var/www/kael-web && npx prisma migrate deploy 2>&1"
```

Expected output: `Applied 1 migration.`

- [ ] **Step 4: Verify tables exist on server**

```bash
ssh -i ~/.ssh/kael_server root@165.22.232.160 \
  "sudo -u postgres psql -d kael -c '\d \"UserPreferences\"'"
```

Expected: Table with columns `id, userId, kaelName, language, tone, customInstruction`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add UserPreferences model and telegramChatId to User"
```

---

## Task 2: API — /api/preferences (GET + PUT)

**Files:**
- Create: `app/api/preferences/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// app/api/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prefs = await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {}
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  return NextResponse.json({ ...prefs, telegramChatId: user?.telegramChatId ?? '' })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { kaelName, language, tone, customInstruction, telegramChatId } = body

  const [prefs] = await Promise.all([
    prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        kaelName: kaelName ?? '',
        language: language ?? 'es',
        tone: tone ?? 'motivacional',
        customInstruction: customInstruction ?? ''
      },
      update: {
        kaelName: kaelName ?? '',
        language: language ?? 'es',
        tone: tone ?? 'motivacional',
        customInstruction: customInstruction ?? ''
      }
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { telegramChatId: telegramChatId ?? null }
    })
  ])

  return NextResponse.json({ ...prefs, telegramChatId: telegramChatId ?? '' })
}
```

- [ ] **Step 2: Verify GET returns 200 for authenticated user**

Login at `/login`, then in browser console:
```javascript
fetch('/api/preferences').then(r => r.json()).then(console.log)
```
Expected: `{ id: "...", userId: "...", kaelName: "", language: "es", tone: "motivacional", customInstruction: "", telegramChatId: "" }`

- [ ] **Step 3: Verify PUT saves correctly**

```javascript
fetch('/api/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kaelName: 'Amigo', tone: 'casual', telegramChatId: '123456' })
}).then(r => r.json()).then(console.log)
```
Expected: returns updated object with `kaelName: "Amigo"`.

- [ ] **Step 4: Commit**

```bash
git add app/api/preferences/route.ts
git commit -m "feat: add /api/preferences GET and PUT"
```

---

## Task 3: API — /api/conversations (GET)

**Files:**
- Create: `app/api/conversations/route.ts`

- [ ] **Step 1: Create route**

```typescript
// app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  if (!user?.telegramChatId) {
    return NextResponse.json({ conversations: [], total: 0 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const [conversations, countResult] = await Promise.all([
    prisma.$queryRaw<Array<{
      id: number
      user_message: string | null
      kael_response: string | null
      timestamp: Date | null
      platform: string | null
    }>>`
      SELECT id, user_message, kael_response, timestamp, platform
      FROM conversation_memory
      WHERE user_id = ${user.telegramChatId}
        AND user_message IS NOT NULL
        AND kael_response IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM conversation_memory
      WHERE user_id = ${user.telegramChatId}
        AND user_message IS NOT NULL
    `
  ])

  return NextResponse.json({
    conversations,
    total: Number(countResult[0]?.count ?? 0)
  })
}
```

- [ ] **Step 2: Test with real user (after setting telegramChatId via PUT /api/preferences)**

```javascript
fetch('/api/conversations?limit=5').then(r => r.json()).then(console.log)
```
Expected: `{ conversations: [...], total: N }` — or `{ conversations: [], total: 0 }` if telegramChatId not set.

- [ ] **Step 3: Commit**

```bash
git add app/api/conversations/route.ts
git commit -m "feat: add /api/conversations GET with pagination"
```

---

## Task 4: API — /api/reminders (GET + POST + DELETE)

**Files:**
- Create: `app/api/reminders/route.ts`

- [ ] **Step 1: Create route**

```typescript
// app/api/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  if (!user?.telegramChatId) {
    return NextResponse.json({ reminders: [] })
  }

  const reminders = await prisma.$queryRaw<Array<{
    id: number
    reminder_text: string
    remind_at: Date
    sent: boolean
    created_at: Date
  }>>`
    SELECT id, reminder_text, remind_at, sent, created_at
    FROM reminders
    WHERE chat_id = ${user.telegramChatId}
    ORDER BY remind_at ASC
    LIMIT 50
  `

  return NextResponse.json({ reminders })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  if (!user?.telegramChatId) {
    return NextResponse.json({ error: 'Telegram no vinculado' }, { status: 400 })
  }

  const { reminderText, remindAt } = await req.json()
  if (!reminderText || !remindAt) {
    return NextResponse.json({ error: 'reminderText y remindAt son requeridos' }, { status: 400 })
  }

  await prisma.$executeRaw`
    INSERT INTO reminders (user_id, chat_id, reminder_text, remind_at)
    VALUES (${user.telegramChatId}, ${user.telegramChatId}, ${reminderText}, ${new Date(remindAt)})
  `

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  if (!user?.telegramChatId) {
    return NextResponse.json({ error: 'Telegram no vinculado' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  await prisma.$executeRaw`
    DELETE FROM reminders
    WHERE id = ${parseInt(id)} AND chat_id = ${user.telegramChatId}
  `

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify GET returns empty array (no telegramChatId set yet)**

```javascript
fetch('/api/reminders').then(r => r.json()).then(console.log)
```
Expected: `{ reminders: [] }`

- [ ] **Step 3: Commit**

```bash
git add app/api/reminders/route.ts
git commit -m "feat: add /api/reminders GET, POST, DELETE"
```

---

## Task 5: Sidebar Component

**Files:**
- Create: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar**

```typescript
// components/dashboard/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  user: { name?: string | null; email?: string | null; plan?: string }
}

const navItems = [
  { href: '/dashboard', icon: '⚡', label: 'Inicio', exact: true },
  { href: '/dashboard/conversations', icon: '💬', label: 'Conversaciones' },
  { href: '/dashboard/reminders', icon: '🔔', label: 'Recordatorios' },
]

const accountItems = [
  { href: '/dashboard/settings', icon: '⚙️', label: 'Configurar Kael' },
  { href: '/dashboard/plan', icon: '💎', label: 'Mi Plan' },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="w-56 min-h-screen bg-[#111] border-r border-[#1e1e1e] flex flex-col px-3 py-6 shrink-0">
      {/* Logo */}
      <div className="px-3 mb-8 text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
        Kael
      </div>

      {/* Nav principal */}
      <p className="px-3 mb-2 text-[0.65rem] uppercase tracking-widest text-zinc-600">Principal</p>
      <nav className="flex flex-col gap-0.5 mb-4">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.href, item.exact)
                ? 'bg-[#1c1c2e] text-white font-medium'
                : 'text-zinc-500 hover:bg-[#1a1a1a] hover:text-zinc-300'
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Cuenta */}
      <p className="px-3 mb-2 text-[0.65rem] uppercase tracking-widest text-zinc-600">Cuenta</p>
      <nav className="flex flex-col gap-0.5">
        {accountItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-[#1c1c2e] text-white font-medium'
                : 'text-zinc-500 hover:bg-[#1a1a1a] hover:text-zinc-300'
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User chip */}
      <div className="mt-auto pt-4 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#161616] border border-[#222]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'K'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{user.name ?? 'Usuario'}</p>
            <p className="text-[0.68rem] text-zinc-600 capitalize">{user.plan ?? 'free'}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full mt-1 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-left"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/Sidebar.tsx
git commit -m "feat: add dashboard Sidebar component"
```

---

## Task 6: Dashboard Layout

**Files:**
- Create: `app/dashboard/layout.tsx`

- [ ] **Step 1: Create layout**

```typescript
// app/dashboard/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-[#080808]">
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          plan: (session.user as any).plan
        }}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify layout renders**

Visit `/dashboard` — should see the sidebar on the left and content on the right. No redirect if logged in.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: add dashboard layout with sidebar"
```

---

## Task 7: KaelConfigForm Component

**Files:**
- Create: `components/dashboard/KaelConfigForm.tsx`

- [ ] **Step 1: Create form**

```typescript
// components/dashboard/KaelConfigForm.tsx
'use client'

import { useState, useEffect } from 'react'

interface Prefs {
  kaelName: string
  language: string
  tone: string
  customInstruction: string
  telegramChatId: string
}

export default function KaelConfigForm() {
  const [prefs, setPrefs] = useState<Prefs>({
    kaelName: '', language: 'es', tone: 'motivacional',
    customInstruction: '', telegramChatId: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/preferences')
      .then(r => r.json())
      .then(data => setPrefs({
        kaelName: data.kaelName ?? '',
        language: data.language ?? 'es',
        tone: data.tone ?? 'motivacional',
        customInstruction: data.customInstruction ?? '',
        telegramChatId: data.telegramChatId ?? ''
      }))
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const tones = ['motivacional', 'casual', 'formal']

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#13113a] to-[#111] p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold text-white">⚙️ Configurar a Kael</h2>
        <span className="text-[0.6rem] bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full font-semibold tracking-wider">
          PRINCIPAL
        </span>
      </div>
      <p className="text-xs text-zinc-500 mb-5">Personaliza cómo Kael te responde en Telegram</p>

      <div className="space-y-4">
        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            ¿Cómo te llama Kael?
          </label>
          <input
            value={prefs.kaelName}
            onChange={e => setPrefs(p => ({ ...p, kaelName: e.target.value }))}
            placeholder="Tu nombre"
            className="w-full bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            Idioma
          </label>
          <select
            value={prefs.language}
            onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
            className="w-full bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇺🇸 Inglés</option>
            <option value="auto">Detectar automáticamente</option>
          </select>
        </div>

        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            Tono de personalidad
          </label>
          <div className="flex gap-2">
            {tones.map(t => (
              <button
                key={t}
                onClick={() => setPrefs(p => ({ ...p, tone: t }))}
                className={`flex-1 py-2 rounded-lg text-xs capitalize transition-colors ${
                  prefs.tone === t
                    ? 'bg-indigo-900/50 border border-indigo-500/60 text-indigo-200 font-semibold'
                    : 'bg-[#0e0e0e] border border-[#282828] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            Instrucción especial <span className="text-zinc-700 normal-case">(opcional)</span>
          </label>
          <input
            value={prefs.customInstruction}
            onChange={e => setPrefs(p => ({ ...p, customInstruction: e.target.value }))}
            placeholder="Ej: Siempre termina con una cita inspiradora"
            className="w-full bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            Tu Telegram Chat ID <span className="text-zinc-700 normal-case">(para ver historial)</span>
          </label>
          <input
            value={prefs.telegramChatId}
            onChange={e => setPrefs(p => ({ ...p, telegramChatId: e.target.value }))}
            placeholder="Ej: 826656822 — envía /start a @userinfobot"
            className="w-full bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-60"
        >
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/KaelConfigForm.tsx
git commit -m "feat: add KaelConfigForm client component"
```

---

## Task 8: Dashboard Home Page Redesign

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
// app/dashboard/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import KaelConfigForm from '@/components/dashboard/KaelConfigForm'

async function getStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true, createdAt: true }
  })

  const daysSince = user?.createdAt
    ? Math.floor((Date.now() - user.createdAt.getTime()) / 86400000)
    : 0

  if (!user?.telegramChatId) {
    return { totalConversations: 0, activeReminders: 0, daysSince }
  }

  const [convResult, remResult] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM conversation_memory
      WHERE user_id = ${user.telegramChatId} AND user_message IS NOT NULL
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM reminders
      WHERE chat_id = ${user.telegramChatId} AND sent = false
    `
  ])

  return {
    totalConversations: Number(convResult[0]?.count ?? 0),
    activeReminders: Number(remResult[0]?.count ?? 0),
    daysSince
  }
}

async function getRecentConversations(telegramChatId: string | null) {
  if (!telegramChatId) return []
  return prisma.$queryRaw<Array<{
    id: number; user_message: string; kael_response: string; timestamp: Date
  }>>`
    SELECT id, user_message, kael_response, timestamp
    FROM conversation_memory
    WHERE user_id = ${telegramChatId}
      AND user_message IS NOT NULL AND kael_response IS NOT NULL
    ORDER BY timestamp DESC LIMIT 2
  `
}

async function getActiveReminders(telegramChatId: string | null) {
  if (!telegramChatId) return []
  return prisma.$queryRaw<Array<{
    id: number; reminder_text: string; remind_at: Date; sent: boolean
  }>>`
    SELECT id, reminder_text, remind_at, sent
    FROM reminders WHERE chat_id = ${telegramChatId}
    ORDER BY remind_at ASC LIMIT 3
  `
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  const [stats, conversations, reminders] = await Promise.all([
    getStats(session.user.id),
    getRecentConversations(user?.telegramChatId ?? null),
    getActiveReminders(user?.telegramChatId ?? null)
  ])

  const firstName = session.user.name?.split(' ')[0] ?? 'Usuario'

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
          Hola, {firstName} 👋
        </h1>
        <p className="text-zinc-500 text-sm">Bienvenido de vuelta — Kael está listo para ti</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Conversaciones', value: stats.totalConversations, sub: 'Mensajes con Kael', icon: '💬', accent: true },
          { label: 'Recordatorios', value: stats.activeReminders, sub: 'Pendientes', icon: '🔔', accent: false },
          { label: 'Días con Kael', value: stats.daysSince, sub: `Miembro desde ${new Date(Date.now() - stats.daysSince * 86400000).toLocaleDateString('es', { month: 'short', year: 'numeric' })}`, icon: '📅', accent: false },
        ].map(s => (
          <div key={s.label} className={`relative rounded-xl p-5 border overflow-hidden ${s.accent ? 'bg-gradient-to-br from-[#13113a] to-[#111] border-[#2a2560]' : 'bg-[#111] border-[#1e1e1e]'}`}>
            <div className="absolute top-4 right-4 text-xl opacity-30">{s.icon}</div>
            <p className="text-[0.72rem] uppercase tracking-wider text-zinc-500 mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-white">{s.value}</p>
            <p className="text-[0.72rem] text-zinc-600 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-[1.45fr_1fr] gap-5">
        {/* Config — primary */}
        <KaelConfigForm />

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Conversations preview */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
            <h2 className="text-sm font-semibold text-white mb-1">💬 Últimas conversaciones</h2>
            <p className="text-[0.75rem] text-zinc-500 mb-4">Vista previa de tus mensajes recientes</p>
            {(conversations as any[]).length === 0 ? (
              <p className="text-xs text-zinc-600 py-2">
                {user?.telegramChatId
                  ? 'Aún no hay conversaciones registradas.'
                  : 'Configura tu Telegram Chat ID para ver el historial.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {(conversations as any[]).map((c: any) => (
                  <div key={c.id} className="rounded-xl bg-[#0e0e0e] border border-[#1a1a1a] p-3">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[0.68rem] text-zinc-600">
                        {new Date(c.timestamp).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[0.68rem] text-zinc-700">📱 Telegram</span>
                    </div>
                    <p className="text-xs text-zinc-300 truncate">
                      <span className="text-indigo-400 font-semibold mr-1">Tú:</span>
                      {c.user_message}
                    </p>
                    <p className="text-xs text-zinc-600 truncate mt-0.5">
                      <span className="text-violet-400 font-semibold mr-1">Kael:</span>
                      {c.kael_response}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/conversations" className="block text-center text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3 transition-colors">
              Ver todo el historial →
            </Link>
          </div>

          {/* Reminders preview */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
            <h2 className="text-sm font-semibold text-white mb-1">🔔 Recordatorios activos</h2>
            <p className="text-[0.75rem] text-zinc-500 mb-4">Próximos pendientes</p>
            {(reminders as any[]).length === 0 ? (
              <p className="text-xs text-zinc-600 py-2">No hay recordatorios activos.</p>
            ) : (
              <div>
                {(reminders as any[]).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-[#161616] last:border-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${r.sent ? 'bg-zinc-700' : 'bg-indigo-500'}`} />
                    <span className={`text-sm flex-1 ${r.sent ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                      {r.reminder_text}
                    </span>
                    <span className="text-[0.7rem] text-zinc-600 whitespace-nowrap">
                      {new Date(r.remind_at).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/reminders" className="block text-center text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3 transition-colors">
              Gestionar recordatorios →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify dashboard renders**

Visit `/dashboard` — should show header, 3 stat cards, config form on left, conversations + reminders preview on right.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: redesign dashboard home with stats, config form, and previews"
```

---

## Task 9: Conversations Page

**Files:**
- Create: `app/dashboard/conversations/page.tsx`

- [ ] **Step 1: Create page**

```typescript
// app/dashboard/conversations/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ConversationsPage({
  searchParams
}: {
  searchParams: { page?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  const page = parseInt((await searchParams).page ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  let conversations: any[] = []
  let total = 0

  if (user?.telegramChatId) {
    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT id, user_message, kael_response, timestamp
        FROM conversation_memory
        WHERE user_id = ${user.telegramChatId}
          AND user_message IS NOT NULL AND kael_response IS NOT NULL
        ORDER BY timestamp DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM conversation_memory
        WHERE user_id = ${user.telegramChatId} AND user_message IS NOT NULL
      `
    ])
    conversations = rows
    total = Number(countRows[0]?.count ?? 0)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">💬 Conversaciones</h1>
        <p className="text-zinc-500 text-sm">{total} mensajes registrados con Kael</p>
      </div>

      {!user?.telegramChatId ? (
        <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-8 text-center">
          <p className="text-zinc-400 mb-4">Configura tu Telegram Chat ID para ver tu historial.</p>
          <Link href="/dashboard/settings" className="text-sm text-indigo-400 hover:text-indigo-300">
            Ir a Configuración →
          </Link>
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-8 text-center">
          <p className="text-zinc-500">Aún no hay conversaciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-[#1e1e1e] bg-[#111] p-4">
              <p className="text-[0.7rem] text-zinc-600 mb-2">
                {new Date(c.timestamp).toLocaleString('es', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
              <p className="text-sm text-zinc-200 mb-1.5">
                <span className="text-indigo-400 font-semibold mr-1.5">Tú:</span>
                {c.user_message}
              </p>
              <p className="text-sm text-zinc-400">
                <span className="text-violet-400 font-semibold mr-1.5">Kael:</span>
                {c.kael_response}
              </p>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-3 pt-4">
              {page > 1 && (
                <Link href={`/dashboard/conversations?page=${page - 1}`}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 border border-[#1e1e1e] hover:border-zinc-600 transition-colors">
                  ← Anterior
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-zinc-600">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/dashboard/conversations?page=${page + 1}`}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 border border-[#1e1e1e] hover:border-zinc-600 transition-colors">
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/conversations/page.tsx
git commit -m "feat: add conversations page with pagination"
```

---

## Task 10: Reminders Page

**Files:**
- Create: `app/dashboard/reminders/page.tsx`

- [ ] **Step 1: Create page**

```typescript
// app/dashboard/reminders/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Reminder {
  id: number
  reminder_text: string
  remind_at: string
  sent: boolean
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [noTelegram, setNoTelegram] = useState(false)
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/reminders').then(r => r.json())
    if (r.error === 'Telegram no vinculado') { setNoTelegram(true); setLoading(false); return }
    setReminders(r.reminders ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addReminder = async () => {
    if (!newText || !newDate) return
    setAdding(true)
    await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderText: newText, remindAt: newDate })
    })
    setNewText('')
    setNewDate('')
    setAdding(false)
    load()
  }

  const deleteReminder = async (id: number) => {
    await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">🔔 Recordatorios</h1>
        <p className="text-zinc-500 text-sm">Gestiona tus recordatorios programados con Kael</p>
      </div>

      {noTelegram ? (
        <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-8 text-center">
          <p className="text-zinc-400 mb-4">Configura tu Telegram Chat ID para gestionar recordatorios.</p>
          <Link href="/dashboard/settings" className="text-sm text-indigo-400 hover:text-indigo-300">
            Ir a Configuración →
          </Link>
        </div>
      ) : (
        <>
          {/* Add form */}
          <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-5 mb-5">
            <p className="text-sm font-medium text-zinc-300 mb-3">Nuevo recordatorio</p>
            <div className="flex gap-3">
              <input
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="¿Qué quieres recordar?"
                className="flex-1 bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
              />
              <input
                type="datetime-local"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={addReminder}
                disabled={adding || !newText || !newDate}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {adding ? '…' : 'Agregar'}
              </button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-zinc-600 text-sm">Cargando…</p>
          ) : reminders.length === 0 ? (
            <p className="text-zinc-600 text-sm">No hay recordatorios. ¡Crea uno arriba!</p>
          ) : (
            <div className="space-y-2">
              {reminders.map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-[#1e1e1e] bg-[#111] p-4">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${r.sent ? 'bg-zinc-700' : 'bg-indigo-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${r.sent ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
                      {r.reminder_text}
                    </p>
                    <p className="text-[0.7rem] text-zinc-600 mt-0.5">
                      {new Date(r.remind_at).toLocaleString('es', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!r.sent && (
                    <button
                      onClick={() => deleteReminder(r.id)}
                      className="text-zinc-700 hover:text-red-500 text-sm transition-colors px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/reminders/page.tsx
git commit -m "feat: add reminders page with create and delete"
```

---

## Task 11: Settings + Plan Pages (minimal)

**Files:**
- Create: `app/dashboard/settings/page.tsx`
- Create: `app/dashboard/plan/page.tsx`

- [ ] **Step 1: Settings page (reuses KaelConfigForm)**

```typescript
// app/dashboard/settings/page.tsx
import KaelConfigForm from '@/components/dashboard/KaelConfigForm'

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">⚙️ Configurar Kael</h1>
        <p className="text-zinc-500 text-sm">Personaliza cómo Kael te responde</p>
      </div>
      <KaelConfigForm />
    </div>
  )
}
```

- [ ] **Step 2: Plan page**

```typescript
// app/dashboard/plan/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PlanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const plan = (session.user as any).plan ?? 'free'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">💎 Mi Plan</h1>
        <p className="text-zinc-500 text-sm">Gestiona tu suscripción</p>
      </div>
      <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Plan actual</p>
        <p className="text-3xl font-bold text-white capitalize mb-4">{plan}</p>
        {plan === 'free' && (
          <>
            <p className="text-sm text-zinc-500 mb-5">Actualiza a Pro para desbloquear historial completo, configuración avanzada y más.</p>
            <button className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 transition-all">
              Mejorar a Pro — Próximamente
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/settings/page.tsx app/dashboard/plan/page.tsx
git commit -m "feat: add settings and plan pages"
```

---

## Task 12: Landing Page — Dashboard Preview Section

**Files:**
- Modify: `app/page.tsx` — add section after the existing `{/* DEMO */}` section (around line 400)

- [ ] **Step 1: Insert the new section**

After the closing `</section>` tag of the DEMO section (after line ~401 which closes `id="demo"`), add:

```tsx
      {/* DASHBOARD PREVIEW */}
      <section className="relative px-6 py-32 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Solo Plan Pro
            </span>
            <p className="text-xs tracking-[0.2em] uppercase text-zinc-600 mb-4">Tu panel de control</p>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Kael a tu manera
            </h2>
            <p className="text-zinc-500 font-light max-w-xl mx-auto">
              Configura su personalidad, revisa tu historial de conversaciones y gestiona tus recordatorios desde un solo lugar.
            </p>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-violet-500/[0.04] rounded-2xl blur-2xl" />
            <div className="relative border border-zinc-800 rounded-2xl overflow-hidden bg-[#0d0d0d]">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-800/80 bg-[#111]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-xs text-zinc-600 ml-2">kael.quest/dashboard</span>
              </div>
              {/* Mock dashboard body */}
              <div className="flex h-64">
                {/* Sidebar */}
                <div className="w-40 bg-[#111] border-r border-zinc-800 px-3 py-4 shrink-0">
                  <p className="text-white font-bold text-sm mb-4 px-2">Kael</p>
                  {['⚡ Inicio', '💬 Conversaciones', '🔔 Recordatorios', '⚙️ Configurar'].map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 text-xs ${i === 0 ? 'bg-[#1c1c2e] text-white' : 'text-zinc-600'}`}>
                      {item}
                    </div>
                  ))}
                </div>
                {/* Content */}
                <div className="flex-1 p-5">
                  <p className="text-white font-semibold text-sm mb-3">Hola, Usuario 👋</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['12 conversaciones', '3 recordatorios', '7 días con Kael'].map((s, i) => (
                      <div key={i} className="bg-[#111] border border-zinc-800 rounded-lg p-2.5">
                        <p className="text-[0.6rem] text-zinc-500 mb-1 uppercase tracking-wider">{s.split(' ').slice(1).join(' ')}</p>
                        <p className="text-lg font-bold text-white">{s.split(' ')[0]}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gradient-to-br from-[#13113a] to-[#111] border border-indigo-500/20 rounded-xl p-3">
                    <p className="text-xs text-zinc-400 mb-2 font-medium">⚙️ Configurar Kael</p>
                    <div className="flex gap-1.5">
                      {['Motivacional', 'Casual', 'Formal'].map((t, i) => (
                        <span key={i} className={`text-[0.6rem] px-2 py-1 rounded-md ${i === 0 ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/50' : 'bg-[#0e0e0e] text-zinc-600 border border-zinc-800'}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-10"
          >
            <button
              onClick={() => router.push('/register')}
              className="group relative px-8 py-3.5 bg-white text-black text-sm font-medium rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10">Empezar gratis</span>
              <div className="absolute inset-0 bg-zinc-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </motion.div>
        </div>
      </section>
```

- [ ] **Step 2: Verify landing page renders the new section**

Visit `http://localhost:3000` and scroll past the demo section — should see the dashboard preview mockup.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add dashboard preview section to landing page"
```

---

## Task 13: Build Verification + Production Deploy

- [ ] **Step 1: Local build check**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 2: Deploy to server**

```bash
ssh -i ~/.ssh/kael_server root@165.22.232.160 \
  "cd /var/www/kael-web && git pull origin main && npm ci --silent && npm run build 2>&1 | tail -15 && systemctl restart kael-web && sleep 3 && curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
```
Expected last line: `200`

- [ ] **Step 3: Smoke test production**

```bash
curl -s -o /dev/null -w '%{http_code}' https://kael.quest
curl -s -o /dev/null -w '%{http_code}' https://kael.quest/login
```
Both expected: `200`

- [ ] **Step 4: Final commit tag**

```bash
git tag v0.2.0-dashboard
git push origin main --tags
```
