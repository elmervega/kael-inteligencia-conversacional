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
