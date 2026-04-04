import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rateLimit'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = checkRateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let email: string
  try {
    const body = await req.json()
    email = (body.email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Always return success to avoid email enumeration
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  // Delete existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } })

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { email, token, expires }
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://kael.quest'
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  await resend.emails.send({
    from: 'Kael <noreply@kael.quest>',
    to: email,
    subject: 'Recupera tu contraseña — Kael',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #f0f0f0; border-radius: 12px;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Kael</h1>
        <p style="color: #888; margin-bottom: 24px;">Recuperación de contraseña</p>
        <p style="margin-bottom: 16px;">Hola${user.name ? `, ${user.name}` : ''},</p>
        <p style="margin-bottom: 24px;">Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar. El enlace expira en <strong>1 hora</strong>.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #fff; color: #000; text-decoration: none; border-radius: 999px; font-weight: 600; font-size: 14px;">
          Restablecer contraseña
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #555;">Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.</p>
        <p style="margin-top: 8px; font-size: 12px; color: #444;">O copia este enlace: ${resetUrl}</p>
      </div>
    `
  })

  return NextResponse.json({ ok: true })
}
