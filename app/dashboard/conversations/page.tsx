// app/dashboard/conversations/page.tsx
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'

export const metadata: Metadata = { title: 'Conversaciones', robots: { index: false } }
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ConversationsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const isPro = (session.user as any).plan === 'pro'

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  const params = await searchParams
  const page = isPro ? parseInt(params.page ?? '1') : 1
  const limit = isPro ? 20 : 5
  const offset = (page - 1) * limit

  let conversations: { id: number; userMessage: string | null; kaelResponse: string | null; timestamp: Date | null }[] = []
  let total = 0

  if (user?.telegramChatId) {
    const where = {
      userId: user.telegramChatId,
      userMessage: { not: null as null },
      kaelResponse: { not: null as null }
    }
    ;[conversations, total] = await Promise.all([
      prisma.conversationMemory.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: { id: true, userMessage: true, kaelResponse: true, timestamp: true }
      }),
      prisma.conversationMemory.count({ where })
    ])
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
          {conversations.map(c => (
            <div key={c.id} className="rounded-xl border border-[#1e1e1e] bg-[#111] p-4">
              <p className="text-[0.7rem] text-zinc-600 mb-2">
                {c.timestamp && new Date(c.timestamp).toLocaleString('es', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
              <p className="text-sm text-zinc-200 mb-1.5">
                <span className="text-indigo-400 font-semibold mr-1.5">Tú:</span>
                {c.userMessage}
              </p>
              <p className="text-sm text-zinc-400">
                <span className="text-violet-400 font-semibold mr-1.5">Kael:</span>
                {c.kaelResponse}
              </p>
            </div>
          ))}

          {!isPro && total > 5 && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 mt-2">
              <span className="text-violet-300 text-sm">💎 Tienes {total} mensajes en total. Actualiza a Pro para ver el historial completo.</span>
              <Link href="/dashboard/plan" className="text-xs text-violet-300 underline ml-auto whitespace-nowrap">Mejorar →</Link>
            </div>
          )}

          {isPro && totalPages > 1 && (
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
