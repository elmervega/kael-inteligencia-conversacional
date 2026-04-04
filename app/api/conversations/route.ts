import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isPro = (session.user as any).plan === 'pro'

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true }
  })

  if (!user?.telegramChatId) {
    return NextResponse.json({ conversations: [], total: 0, isPro })
  }

  const { searchParams } = new URL(req.url)
  const requestedLimit = parseInt(searchParams.get('limit') ?? '20')
  const limit = isPro ? Math.min(requestedLimit, 100) : 5
  const offset = isPro ? parseInt(searchParams.get('offset') ?? '0') : 0

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
    total: Number(countResult[0]?.count ?? 0),
    isPro
  })
}
