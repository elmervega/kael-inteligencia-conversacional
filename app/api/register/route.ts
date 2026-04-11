import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'
import { registerSchema } from '@/lib/validations'
import { withRateLimit, rateLimitConfig } from '@/lib/rateLimit'
import { handleApiError, ERROR_CODES, logError } from '@/lib/errorHandling'

async function registerHandler(req: NextRequest) {
  try {
    const body = await req.json()

    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input provided. Please check your data.', code: ERROR_CODES.INVALID_INPUT },
        { status: 400 }
      )
    }

    const { name, email, password } = validationResult.data

    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) {
      logError('register', 'Email already exists', { email })
      return NextResponse.json(
        { error: 'An account with this email already exists.', code: ERROR_CODES.EMAIL_ALREADY_EXISTS },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: { name, email, password: hashedPassword }
    })

    // Create verification token (24h expiry)
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Delete any existing token for this email before creating new one
    await prisma.emailVerificationToken.deleteMany({ where: { email } })
    await prisma.emailVerificationToken.create({ data: { email, token, expires } })

    // Send verification email
    const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Kael <noreply@kael.quest>',
      to: email,
      subject: 'Confirma tu email — Kael',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #050505; color: #fff; padding: 40px 20px; max-width: 480px; margin: 0 auto; border-radius: 16px;">
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Hola, ${name} 👋</h1>
          <p style="color: #a1a1aa; margin-bottom: 32px;">Confirma tu email para activar tu cuenta en Kael.</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #fff; color: #000; padding: 14px 28px; border-radius: 50px; font-weight: 600; text-decoration: none; font-size: 15px;">
            Confirmar email →
          </a>
          <p style="color: #52525b; font-size: 13px; margin-top: 32px;">Este enlace expira en 24 horas. Si no creaste una cuenta, ignora este mensaje.</p>
        </div>
      `
    })

    return NextResponse.json({ message: 'Check your email to verify your account.', emailSent: true }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'register_post', ERROR_CODES.INTERNAL_SERVER_ERROR, 500)
  }
}

export const POST = withRateLimit(registerHandler, rateLimitConfig.register)
