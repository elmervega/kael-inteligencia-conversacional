import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { token } = body as { token?: string }
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token requerido.' }, { status: 400 })
  }

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } })

  if (!record) {
    return NextResponse.json({ error: 'TOKEN_INVALID', message: 'El enlace no es válido.' }, { status: 400 })
  }

  if (record.expires < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { token } })
    return NextResponse.json({ error: 'TOKEN_EXPIRED', message: 'El enlace expiró. Regístrate de nuevo para obtener uno nuevo.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { email: record.email },
    data: { emailVerified: new Date() }
  })

  await prisma.emailVerificationToken.delete({ where: { token } })

  return NextResponse.json({ ok: true })
}
