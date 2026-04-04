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

  const isPro = (session.user as any).plan === 'pro'
  if (!isPro) {
    return NextResponse.json({ error: 'Plan Pro requerido', upgrade: true }, { status: 403 })
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

  const isPro = (session.user as any).plan === 'pro'
  if (!isPro) {
    return NextResponse.json({ error: 'Plan Pro requerido', upgrade: true }, { status: 403 })
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
