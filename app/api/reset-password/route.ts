import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(.{8,})$/

export async function POST(req: NextRequest) {
  let token: string, password: string
  try {
    const body = await req.json()
    token = (body.token ?? '').trim()
    password = body.password ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: 'Token required.' }, { status: 400 })
  }

  if (!PASSWORD_REGEX.test(password)) {
    return NextResponse.json(
      { error: 'Mínimo 8 caracteres, una mayúscula, un número y un símbolo.' },
      { status: 400 }
    )
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!resetToken || resetToken.expires < new Date()) {
    await prisma.passwordResetToken.deleteMany({ where: { token } })
    return NextResponse.json(
      { error: 'El enlace expiró o no es válido. Solicita uno nuevo.' },
      { status: 400 }
    )
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashed }
  })

  await prisma.passwordResetToken.delete({ where: { token } })

  return NextResponse.json({ ok: true })
}
