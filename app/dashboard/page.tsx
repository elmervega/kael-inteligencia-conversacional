// app/dashboard/page.tsx
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'

// El template en layout.tsx resuelve esto como "Inicio | Kael"
export const metadata: Metadata = {
  title: 'Inicio',
  robots: { index: false },
}
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import KaelConfigForm from '@/components/dashboard/KaelConfigForm'
import DeleteAccountButton from '@/components/dashboard/DeleteAccountButton'

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

  const [totalConversations, activeReminders] = await Promise.all([
    prisma.conversationMemory.count({
      where: { userId: user.telegramChatId, userMessage: { not: null } }
    }),
    prisma.botReminder.count({
      where: { chatId: user.telegramChatId, sent: false }
    })
  ])

  return { totalConversations, activeReminders, daysSince }
}

async function getRecentConversations(telegramChatId: string | null) {
  if (!telegramChatId) return []
  return prisma.conversationMemory.findMany({
    where: {
      userId: telegramChatId,
      userMessage: { not: null },
      kaelResponse: { not: null }
    },
    orderBy: { timestamp: 'desc' },
    take: 2,
    select: { id: true, userMessage: true, kaelResponse: true, timestamp: true }
  })
}

async function getActiveReminders(telegramChatId: string | null) {
  if (!telegramChatId) return []
  return prisma.botReminder.findMany({
    where: { chatId: telegramChatId },
    orderBy: { remindAt: 'asc' },
    take: 3,
    select: { id: true, reminderText: true, remindAt: true, sent: true }
  })
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) {
    console.error('[dashboard/page] session.user.id missing — session:', JSON.stringify({ user: session?.user }))
    redirect('/login')
  }

  const isPro = (session.user as any).plan === 'pro'

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

  const memberSinceDate = new Date(Date.now() - stats.daysSince * 86400000)
  const memberSince = memberSinceDate.toLocaleDateString('es', { month: 'short', year: 'numeric' })

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
          Hola, {firstName} 👋
        </h1>
        <p className="text-zinc-500 text-sm">Bienvenido de vuelta — Kael está listo para ti</p>
      </div>

      {/* Chat CTA */}
      <Link
        href="/dashboard/chat"
        className="flex items-center justify-between mb-6 px-5 py-4 rounded-2xl border border-indigo-900/40 bg-gradient-to-r from-[#0d0b2a] to-[#111] hover:border-indigo-700/60 hover:from-[#13113a] transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-indigo-400">
              <path d="M12 2L5 9L12 16L19 9L12 2Z" />
              <path d="M12 22L5 15L12 8L19 15L12 22Z" />
              <path d="M5 9L19 9" /><path d="M5 15L19 15" /><path d="M12 8L12 16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Habla con Kael</p>
            <p className="text-xs text-zinc-500">Tu asistente inteligente está listo</p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Conversaciones', value: stats.totalConversations, sub: 'Mensajes con Kael', icon: '💬', accent: true },
          { label: 'Recordatorios', value: stats.activeReminders, sub: 'Pendientes', icon: '🔔', accent: false },
          { label: 'Días con Kael', value: stats.daysSince, sub: `Miembro desde ${memberSince}`, icon: '📅', accent: false },
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
      <div className="grid grid-cols-[1.45fr_1fr] gap-5 mb-5">
        {/* Config form — primary */}
        <KaelConfigForm isPro={isPro} />

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
                      {c.userMessage}
                    </p>
                    <p className="text-xs text-zinc-600 truncate mt-0.5">
                      <span className="text-violet-400 font-semibold mr-1">Kael:</span>
                      {c.kaelResponse}
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
                      {r.reminderText}
                    </span>
                    <span className="text-[0.7rem] text-zinc-600 whitespace-nowrap">
                      {new Date(r.remindAt!).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
      {/* Danger zone */}
      <div className="max-w-xs">
        <DeleteAccountButton email={session.user.email!} />
      </div>
    </div>
  )
}
