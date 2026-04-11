# Sistema Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proteger `/dashboard-sistema` con autenticación propia (independiente de NextAuth/Kael), agregar logs clasificados por severidad y eventos de seguridad en tiempo real.

**Architecture:** Auth separada basada en JWT firmado con `SISTEMA_JWT_SECRET` propio, verificado en el middleware via `jose`. Dos APIs independientes (`/api/sistema/logs` y `/api/sistema/security`) con polling escalonado (15s y 30s). Frontend rediseñado con colores por severidad y sección de seguridad.

**Tech Stack:** Next.js 15, jose ^5.1.0, bcryptjs, TypeScript, Tailwind CSS, journalctl, fail2ban-client

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `lib/sistema-auth.ts` | `signSistemaToken()`, `verifySistemaToken()` usando jose |
| Crear | `app/api/sistema/auth/route.ts` | POST login (bcrypt + JWT cookie) / DELETE logout |
| Modificar | `middleware.ts` | Agregar verificación JWT para `/dashboard-sistema` y `/api/sistema/*` |
| Crear | `app/sistema/login/page.tsx` | Formulario de login del panel de sistema |
| Crear | `app/api/sistema/logs/route.ts` | Logs clasificados, sanitizados, últimos 100 |
| Crear | `app/api/sistema/security/route.ts` | Fail2ban IPs, logins fallidos, rate limit hits |
| Modificar | `app/dashboard-sistema/page.tsx` | Rediseño completo con filtros y sección seguridad |

---

## Task 1: `lib/sistema-auth.ts` — Helpers JWT

**Files:**
- Create: `lib/sistema-auth.ts`

- [ ] **Crear `lib/sistema-auth.ts`**

```typescript
import { SignJWT, jwtVerify } from 'jose'

function getSecret(): Uint8Array {
  const secret = process.env.SISTEMA_JWT_SECRET
  if (!secret) throw new Error('SISTEMA_JWT_SECRET no configurado')
  return new TextEncoder().encode(secret)
}

export async function signSistemaToken(username: string): Promise<string> {
  return new SignJWT({ sub: username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifySistemaToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}
```

- [ ] **Verificar que `jose` está instalado**

```bash
cd /var/www/kael-web && node -e "require('jose'); console.log('jose OK')"
```
Resultado esperado: `jose OK`

- [ ] **Commit**

```bash
git add lib/sistema-auth.ts
git commit -m "feat: helpers JWT para sistema admin session"
```

---

## Task 2: `app/api/sistema/auth/route.ts` — Login / Logout

**Files:**
- Create: `app/api/sistema/auth/route.ts`

- [ ] **Crear `app/api/sistema/auth/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signSistemaToken } from '@/lib/sistema-auth'

// Rate limiting: 5 intentos por IP cada 15 minutos
const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429 }
    )
  }

  let body: { username?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const { username, password } = body
  const validUser = process.env.SISTEMA_ADMIN_USER
  const validHash = process.env.SISTEMA_ADMIN_PASSWORD_HASH

  // Mensaje genérico: no revelar si el usuario existe o no
  const invalid = () =>
    NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })

  if (!validUser || !validHash || !username || !password) return invalid()
  if (username !== validUser) return invalid()

  const passwordOk = await bcrypt.compare(password, validHash)
  if (!passwordOk) return invalid()

  const token = await signSistemaToken(username)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('sistema-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('sistema-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return res
}
```

- [ ] **Commit**

```bash
git add app/api/sistema/auth/route.ts
git commit -m "feat: API de login/logout para sistema admin"
```

---

## Task 3: Middleware — Agregar protección JWT

**Files:**
- Modify: `middleware.ts`

- [ ] **Reemplazar contenido de `middleware.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

async function verifySistemaJWT(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.SISTEMA_JWT_SECRET ?? '')
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protección del panel de sistema (JWT propio, independiente de NextAuth)
  if (
    pathname.startsWith('/dashboard-sistema') ||
    (pathname.startsWith('/api/sistema/') && !pathname.startsWith('/api/sistema/auth'))
  ) {
    const token = request.cookies.get('sistema-session')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/sistema/login', request.url))
    }
    const valid = await verifySistemaJWT(token)
    if (!valid) {
      return NextResponse.redirect(new URL('/sistema/login', request.url))
    }
    return NextResponse.next()
  }

  // Protección del dashboard de Kael (NextAuth session cookie)
  if (pathname.startsWith('/dashboard')) {
    const cookieHeader = request.headers.get('cookie') ?? ''
    const hasSession = cookieHeader.includes('authjs.session-token=')
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard-sistema',
    '/dashboard-sistema/:path*',
    '/api/sistema/:path*',
  ],
}
```

- [ ] **Commit**

```bash
git add middleware.ts
git commit -m "feat: proteger /dashboard-sistema con JWT de sistema admin"
```

---

## Task 4: `app/sistema/login/page.tsx` — Página de Login

**Files:**
- Create: `app/sistema/login/page.tsx`

- [ ] **Crear `app/sistema/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SistemaLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/sistema/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      router.push('/dashboard-sistema')
    } else if (res.status === 429) {
      setError('Demasiados intentos. Espera 15 minutos.')
      setLoading(false)
    } else {
      setError('Credenciales incorrectas')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl mx-auto mb-4">
            🛡️
          </div>
          <h1 className="text-xl font-bold text-white">Panel de Sistema</h1>
          <p className="text-zinc-500 text-sm mt-1">Acceso restringido</p>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-900/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
                Usuario
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => { setForm({ ...form, username: e.target.value }); setError(null) }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => { setForm({ ...form, password: e.target.value }); setError(null) }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">
          Sesión expira en 8 horas
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Commit**

```bash
git add app/sistema/login/page.tsx
git commit -m "feat: página de login para sistema admin"
```

---

## Task 5: `app/api/sistema/logs/route.ts` — API de Logs

**Files:**
- Create: `app/api/sistema/logs/route.ts`

- [ ] **Crear `app/api/sistema/logs/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

function classifyLevel(message: string): 'error' | 'warning' | 'info' {
  const m = message.toLowerCase()
  if (
    m.includes('[auth][error]') ||
    m.includes('missingcsrf') ||
    m.includes('credentialssignin') ||
    m.includes('auth() returned null') ||
    m.includes('session.user.id missing') ||
    m.includes('bus error') ||
    m.includes('enoent') ||
    m.includes('unhandledrejection') ||
    m.includes('"error"') ||
    /\berror:/i.test(message)
  ) return 'error'

  if (
    m.includes('[security]') ||
    m.includes('rate limit exceeded') ||
    m.includes('unauthorized') ||
    m.includes('warn') ||
    m.includes('⚠️')
  ) return 'warning'

  return 'info'
}

function sanitize(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***')
    .replace(/Bearer [a-zA-Z0-9\-._~+/]+=*/g, 'Bearer ***')
    .replace(/password[:\s"']+\S+/gi, 'password:***')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '***EMAIL***')
}

export async function GET() {
  try {
    const { stdout } = await execPromise(
      'journalctl -u kael-web -n 100 --no-pager --output=short-iso 2>&1'
    )

    const logs = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(' ')
        const timestamp = parts[0] ?? new Date().toISOString()
        const rawMessage = parts.slice(4).join(' ')
        const message = sanitize(rawMessage)
        const level = classifyLevel(message)
        return { timestamp, level, message }
      })
      .reverse() // Más reciente primero

    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ logs: [], error: 'No se pudieron obtener los logs' })
  }
}
```

- [ ] **Commit**

```bash
git add app/api/sistema/logs/route.ts
git commit -m "feat: API de logs clasificados con sanitización"
```

---

## Task 6: `app/api/sistema/security/route.ts` — API de Seguridad

**Files:**
- Create: `app/api/sistema/security/route.ts`

- [ ] **Crear `app/api/sistema/security/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export async function GET() {
  const result = {
    failedLogins: { count24h: 0, recent: [] as Array<{ timestamp: string; type: string }> },
    bannedIPs: [] as string[],
    rateLimitHits: { count24h: 0, recent: [] as Array<{ timestamp: string; message: string }> },
    dashboardAuthErrors: { count24h: 0 },
  }

  // Logins fallidos, rate limit hits y errores de auth del dashboard
  try {
    const { stdout } = await execPromise(
      'journalctl -u kael-web --since "24 hours ago" --no-pager --output=short-iso 2>&1'
    )
    const lines = stdout.split('\n').filter(l => l.trim())

    for (const line of lines) {
      const parts = line.split(' ')
      const timestamp = parts[0] ?? ''

      if (line.includes('CredentialsSignin') || line.includes('MissingCSRF')) {
        result.failedLogins.count24h++
        result.failedLogins.recent.push({
          timestamp,
          type: line.includes('MissingCSRF') ? 'MissingCSRF' : 'CredentialsSignin',
        })
      }

      if (line.includes('Rate limit exceeded')) {
        result.rateLimitHits.count24h++
        const msgStart = line.indexOf('[Security]')
        result.rateLimitHits.recent.push({
          timestamp,
          message: msgStart >= 0 ? line.slice(msgStart) : line.slice(-80),
        })
      }

      if (line.includes('auth() returned null') || line.includes('session.user.id missing')) {
        result.dashboardAuthErrors.count24h++
      }
    }

    // Mantener solo los últimos 10 / 5
    result.failedLogins.recent = result.failedLogins.recent.slice(-10)
    result.rateLimitHits.recent = result.rateLimitHits.recent.slice(-5)
  } catch {
    // Los otros checks continúan aunque este falle
  }

  // IPs bloqueadas por fail2ban
  try {
    const { stdout } = await execPromise('fail2ban-client status sshd 2>&1')
    const match = stdout.match(/Banned IP list:\s*(.+)/s)
    if (match) {
      result.bannedIPs = match[1]
        .trim()
        .split(/\s+/)
        .filter(ip => ip.length > 0 && ip !== 'No')
    }
  } catch {
    result.bannedIPs = []
  }

  return NextResponse.json(result)
}
```

- [ ] **Commit**

```bash
git add app/api/sistema/security/route.ts
git commit -m "feat: API de eventos de seguridad (fail2ban, logins fallidos)"
```

---

## Task 7: `app/dashboard-sistema/page.tsx` — Rediseño completo

**Files:**
- Modify: `app/dashboard-sistema/page.tsx`

- [ ] **Reemplazar `app/dashboard-sistema/page.tsx` con el rediseño**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Log {
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
}

interface SecurityData {
  failedLogins: { count24h: number; recent: Array<{ timestamp: string; type: string }> }
  bannedIPs: string[]
  rateLimitHits: { count24h: number; recent: Array<{ timestamp: string; message: string }> }
  dashboardAuthErrors: { count24h: number }
}

interface ServiceStatus {
  timestamp: string
  services: {
    database?: { status: string; description: string }
    redis?: { status: string; description: string; stats?: { connected_clients: string; total_commands: string } }
  }
  uptime?: string
}

type FilterLevel = 'all' | 'error' | 'warning' | 'info'

export default function DashboardSistema() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceStatus | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [security, setSecurity] = useState<SecurityData | null>(null)
  const [logsError, setLogsError] = useState(false)
  const [securityError, setSecurityError] = useState(false)
  const [filter, setFilter] = useState<FilterLevel>('all')
  const [logsUpdate, setLogsUpdate] = useState<Date | null>(null)
  const [securityUpdate, setSecurityUpdate] = useState<Date | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/system/status')
      if (res.ok) setServices(await res.json())
    } catch {}
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/sistema/logs')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLogs(data.logs ?? [])
      setLogsUpdate(new Date())
      setLogsError(false)
    } catch {
      setLogsError(true)
    }
  }, [])

  const fetchSecurity = useCallback(async () => {
    try {
      const res = await fetch('/api/sistema/security')
      if (!res.ok) throw new Error()
      setSecurity(await res.json())
      setSecurityUpdate(new Date())
      setSecurityError(false)
    } catch {
      setSecurityError(true)
    }
  }, [])

  useEffect(() => {
    fetchServices()
    fetchLogs()
    fetchSecurity()
    const t1 = setInterval(fetchServices, 30000)
    const t2 = setInterval(fetchLogs, 15000)
    const t3 = setInterval(fetchSecurity, 30000)
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3) }
  }, [fetchServices, fetchLogs, fetchSecurity])

  const handleLogout = async () => {
    await fetch('/api/sistema/auth', { method: 'DELETE' })
    router.push('/sistema/login')
  }

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter)

  const levelRow = (level: string) => ({
    error: 'bg-red-950/30 border-red-900/40 hover:bg-red-950/50',
    warning: 'bg-yellow-950/30 border-yellow-900/40 hover:bg-yellow-950/50',
    info: 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900',
  }[level] ?? 'bg-zinc-900/60 border-zinc-800')

  const levelText = (level: string) => ({
    error: 'text-red-300',
    warning: 'text-yellow-200',
    info: 'text-zinc-300',
  }[level] ?? 'text-zinc-300')

  const levelDot = (level: string) => ({
    error: '🔴',
    warning: '🟡',
    info: '⚪',
  }[level] ?? '⚪')

  const filterBtn = (f: FilterLevel, label: string) => {
    const active = filter === f
    const base = 'px-3 py-1 text-xs rounded-full border transition'
    const styles: Record<FilterLevel, string> = {
      all: active ? 'bg-zinc-700 border-zinc-500 text-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      error: active ? 'bg-red-900/60 border-red-700 text-red-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      warning: active ? 'bg-yellow-900/60 border-yellow-700 text-yellow-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      info: active ? 'bg-zinc-700 border-zinc-500 text-zinc-200' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
    }
    return `${base} ${styles[f]}`
  }

  const countOf = (l: FilterLevel) => l === 'all' ? logs.length : logs.filter(x => x.level === l).length

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">🛡️ Panel de Sistema</h1>
          <p className="text-[0.7rem] text-zinc-600 mt-0.5">Kael Web — Administración independiente</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-xs text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-900 hover:text-white transition"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">

        {/* Services row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* DB */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">🗄️ PostgreSQL</p>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              services?.services.database?.status?.includes('✅')
                ? 'bg-green-900/30 text-green-400 border-green-800'
                : 'bg-red-900/30 text-red-400 border-red-800'
            }`}>
              {services?.services.database?.status ?? '—'}
            </span>
            <p className="text-xs text-zinc-500 mt-2">{services?.services.database?.description ?? 'Cargando...'}</p>
          </div>
          {/* Redis */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">⚡ Redis</p>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              services?.services.redis?.status?.includes('✅')
                ? 'bg-green-900/30 text-green-400 border-green-800'
                : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
            }`}>
              {services?.services.redis?.status ?? '—'}
            </span>
            <p className="text-xs text-zinc-500 mt-2">{services?.services.redis?.description ?? 'Cargando...'}</p>
          </div>
          {/* Uptime */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">⏱️ Uptime</p>
            <p className="text-xs text-zinc-300 font-mono mt-3">{services?.uptime ?? 'Cargando...'}</p>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">📋 Logs de Aplicación</h2>
              <p className="text-[0.68rem] text-zinc-600 mt-0.5">
                {logsUpdate
                  ? `Actualizado ${logsUpdate.toLocaleTimeString('es')} · refresca cada 15s`
                  : 'Cargando...'}
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'error', 'warning', 'info'] as FilterLevel[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={filterBtn(f, f)}
                >
                  {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="ml-1 opacity-60">({countOf(f)})</span>
                </button>
              ))}
            </div>
          </div>

          {logsError ? (
            <p className="text-red-400 text-sm py-6 text-center">Error al cargar logs. Reintentando...</p>
          ) : (
            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <p className="text-zinc-600 text-sm py-6 text-center">Sin logs con este filtro</p>
              ) : filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className={`rounded-lg border px-3 py-2 cursor-pointer transition ${levelRow(log.level)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs shrink-0 mt-0.5 select-none">{levelDot(log.level)}</span>
                    <span className="text-[0.65rem] text-zinc-600 shrink-0 font-mono mt-0.5">
                      {(() => { try { return new Date(log.timestamp).toLocaleTimeString('es') } catch { return log.timestamp.slice(11, 19) } })()}
                    </span>
                    <span className={`text-[0.72rem] font-mono flex-1 ${levelText(log.level)} ${expandedIdx === idx ? 'whitespace-pre-wrap break-all' : 'truncate'}`}>
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">🔒 Eventos de Seguridad</h2>
              <p className="text-[0.68rem] text-zinc-600 mt-0.5">
                {securityUpdate
                  ? `Actualizado ${securityUpdate.toLocaleTimeString('es')} · refresca cada 30s`
                  : 'Cargando...'}
              </p>
            </div>
          </div>

          {securityError ? (
            <p className="text-red-400 text-sm py-6 text-center">Error al cargar seguridad. Reintentando...</p>
          ) : !security ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-20 bg-zinc-800 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Logins fallidos', value: security.failedLogins.count24h, danger: security.failedLogins.count24h > 0 },
                  { label: 'IPs bloqueadas', value: security.bannedIPs.length, danger: false },
                  { label: 'Rate limit hits', value: security.rateLimitHits.count24h, danger: security.rateLimitHits.count24h > 5 },
                  { label: 'Errores de auth', value: security.dashboardAuthErrors.count24h, danger: security.dashboardAuthErrors.count24h > 0 },
                ].map(m => (
                  <div key={m.label} className="bg-black/30 border border-zinc-800 rounded-xl p-4">
                    <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider mb-1.5">{m.label}</p>
                    <p className={`text-2xl font-bold ${m.danger ? 'text-red-400' : m.value > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {m.value}
                    </p>
                    <p className="text-[0.62rem] text-zinc-600 mt-0.5">últimas 24h</p>
                  </div>
                ))}
              </div>

              {/* IPs bloqueadas */}
              {security.bannedIPs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">IPs bloqueadas por fail2ban:</p>
                  <div className="flex flex-wrap gap-2">
                    {security.bannedIPs.map(ip => (
                      <span key={ip} className="px-2.5 py-1 bg-red-950/30 border border-red-900/40 rounded-full text-xs text-red-400 font-mono">
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Intentos fallidos recientes */}
              {security.failedLogins.recent.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Intentos de login fallidos recientes:</p>
                  <div className="space-y-1.5">
                    {[...security.failedLogins.recent].reverse().slice(0, 8).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2">
                        <span className="text-[0.65rem] text-zinc-600 font-mono shrink-0">
                          {(() => { try { return new Date(item.timestamp).toLocaleTimeString('es') } catch { return item.timestamp.slice(11,19) } })()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[0.65rem] font-semibold ${
                          item.type === 'MissingCSRF'
                            ? 'bg-orange-900/40 text-orange-400'
                            : 'bg-red-900/40 text-red-400'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rate limit hits */}
              {security.rateLimitHits.recent.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Rate limit hits recientes:</p>
                  <div className="space-y-1.5">
                    {security.rateLimitHits.recent.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-yellow-950/20 border border-yellow-900/30 rounded-lg px-3 py-2">
                        <span className="text-[0.65rem] text-zinc-600 font-mono shrink-0">
                          {(() => { try { return new Date(item.timestamp).toLocaleTimeString('es') } catch { return item.timestamp.slice(11,19) } })()}
                        </span>
                        <span className="text-[0.7rem] text-yellow-300 truncate">{item.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {security.failedLogins.count24h === 0 &&
               security.bannedIPs.length === 0 &&
               security.rateLimitHits.count24h === 0 &&
               security.dashboardAuthErrors.count24h === 0 && (
                <p className="text-green-400 text-sm py-2 text-center">✅ Sin eventos de seguridad en las últimas 24h</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add app/dashboard-sistema/page.tsx
git commit -m "feat: rediseño de dashboard-sistema con logs coloreados y seguridad"
```

---

## Task 8: Variables de entorno en el servidor

**Files:**
- Modify: `/var/www/kael-web/.env` (en el servidor)

- [ ] **Generar el hash bcrypt de la contraseña admin en el servidor**

```bash
ssh -i ~/.ssh/kael_server root@165.22.232.160
cd /var/www/kael-web
node -e "const b=require('bcryptjs'); b.hash('TU_CONTRASEÑA_AQUI',12).then(h=>console.log(h))"
```
Copia el hash resultante (empieza con `$2b$12$...`)

- [ ] **Generar un secreto JWT de 64 caracteres**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] **Agregar al `.env` del servidor**

```bash
nano /var/www/kael-web/.env
```

Agregar al final:
```
SISTEMA_ADMIN_USER=admin
SISTEMA_ADMIN_PASSWORD_HASH=$2b$12$<el_hash_generado>
SISTEMA_JWT_SECRET=<los_64_chars_generados>
```

- [ ] **Verificar que las variables están presentes**

```bash
grep -E "SISTEMA_ADMIN|SISTEMA_JWT" /var/www/kael-web/.env | sed 's/=.*/=***/'
```
Resultado esperado:
```
SISTEMA_ADMIN_USER=***
SISTEMA_ADMIN_PASSWORD_HASH=***
SISTEMA_JWT_SECRET=***
```

---

## Task 9: Deploy y Verificación

- [ ] **Push al repositorio para disparar GitHub Actions**

```bash
git push origin main
```

- [ ] **Reiniciar servicio en el servidor (si GitHub Actions falla)**

```bash
ssh -i ~/.ssh/kael_server root@165.22.232.160
cd /var/www/kael-web
npm run build && systemctl restart kael-web
```

- [ ] **Verificar que `/sistema/login` redirige correctamente sin cookie**

```bash
curl -si https://kael.quest/dashboard-sistema -o /dev/null -w '%{http_code} -> %{redirect_url}\n'
```
Resultado esperado: `307 -> https://kael.quest/sistema/login`

- [ ] **Verificar login desde el navegador**

1. Abrir `https://kael.quest/sistema/login`
2. Ingresar usuario y contraseña del `.env`
3. Confirmar redirección a `https://kael.quest/dashboard-sistema`
4. Verificar que se ven logs con colores (🔴/🟡/⚪)
5. Verificar que la sección de seguridad muestra los contadores
6. Verificar que el botón "Cerrar sesión" redirige a `/sistema/login`

- [ ] **Verificar que `/api/sistema/logs` sin cookie devuelve 307**

```bash
curl -si https://kael.quest/api/sistema/logs -o /dev/null -w '%{http_code}\n'
```
Resultado esperado: `307`

---

## Self-Review

**Cobertura del spec:**
- ✅ Auth independiente con JWT propio y `SISTEMA_JWT_SECRET`
- ✅ Bcrypt hash en `.env`, nunca texto plano
- ✅ Cookie `HttpOnly + Secure + SameSite=Strict + 8h`
- ✅ Rate limiting en login (5 intentos / 15 min)
- ✅ Middleware con verificación JWT completa via `jose`
- ✅ `/api/sistema/auth` excluida de la protección (es el login endpoint)
- ✅ APIs separadas (`/logs` y `/security`) con polling escalonado
- ✅ Logs clasificados por severidad con sanitización
- ✅ Eventos de seguridad: fail2ban IPs, logins fallidos, rate limit hits, auth errors
- ✅ Frontend con filtros, colores por severidad, expandible al click
- ✅ Fallas independientes: si `/api/sistema/security` falla, los logs siguen
- ✅ Logout funcional

**Consistencia de tipos:** `Log.level` es `'error' | 'warning' | 'info'` en la API y en el frontend. `SecurityData` matches exactamente el shape del route. ✅

**Sin placeholders:** Todo el código está completo. ✅
