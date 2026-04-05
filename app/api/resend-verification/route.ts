import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'
import { withRateLimit } from '@/lib/rateLimit'

const config = { window: 15 * 60 * 1000, max: 3 }

async function handler(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { email } = body as { email?: string }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true }) // no enumeration
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { name: true, emailVerified: true } })

  // Always return ok — no enumeration, no "user not found"
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true })
  }

  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.emailVerificationToken.deleteMany({ where: { email } })
  await prisma.emailVerificationToken.create({ data: { email, token, expires } })

  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'Kael <noreply@kael.quest>',
    to: email,
    subject: 'Confirma tu email — Kael',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #050505; color: #fff; padding: 40px 20px; max-width: 480px; margin: 0 auto; border-radius: 16px;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Hola, ${user.name ?? 'usuario'} 👋</h1>
        <p style="color: #a1a1aa; margin-bottom: 32px;">Confirma tu email para activar tu cuenta en Kael.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #fff; color: #000; padding: 14px 28px; border-radius: 50px; font-weight: 600; text-decoration: none; font-size: 15px;">
          Confirmar email →
        </a>
        <p style="color: #52525b; font-size: 13px; margin-top: 32px;">Este enlace expira en 24 horas.</p>
      </div>
    `
  })

  return NextResponse.json({ ok: true })
}

export const POST = withRateLimit(handler, config)
