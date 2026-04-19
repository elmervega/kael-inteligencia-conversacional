import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { authConfig } from '../auth.config'
import { checkRateLimitRedis } from './rateLimitRedis'

class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_not_verified' as const
}

class LoginRateLimitError extends CredentialsSignin {
  code = 'rate_limit' as const
}

class UserBlockedError extends CredentialsSignin {
  code = 'user_blocked' as const
}

// Rate limiting: 10 intentos por IP cada 15 minutos (Redis-backed)
async function checkLoginRateLimit(ip: string): Promise<boolean> {
  const { allowed } = await checkRateLimitRedis(`login:${ip}`, 10, 15 * 60 * 1000)
  return allowed
}

export const {
  handlers,
  signIn,
  signOut,
  auth
} = NextAuth({
  ...authConfig,
  trustHost: true,

  // Sesión JWT con maxAge explícito.
  // Sin esto, NextAuth puede omitir Max-Age en la cookie y el WebView de Android
  // la trata como session-only (volátil, en memoria) — se pierde al cerrar la app.
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  // Forzar Max-Age en el Set-Cookie header.
  // Android WebView Chromium exige que la cookie tenga Max-Age para escribirla al
  // disco persistente. Sin este atributo, la cookie vive solo en RAM y muere con
  // el proceso cuando el usuario cierra la app desde la multitarea.
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // maxAge + expires combinados: cobertura dual para todos los Android WebViews.
        // Algunos WebViews solo persisten al disco si ven el atributo "Expires" en el
        // Set-Cookie header; otros solo respetan "Max-Age". Ambos = garantía total.
        maxAge: 30 * 24 * 60 * 60,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email o teléfono', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        // Rate limiting por IP
        const ip =
          (request as any)?.headers?.get('cf-connecting-ip') ||
          (request as any)?.headers?.get('x-forwarded-for')?.split(',')[0] ||
          'unknown'
        if (!await checkLoginRateLimit(ip)) {
          console.warn(`[Security] Login rate limit exceeded for IP: ${ip}`)
          throw new LoginRateLimitError()
        }

        const identifier = (credentials.email as string).trim()
        const isPhone = /^[\+\d][\d\s\-\(\)]{5,}$/.test(identifier) && !identifier.includes('@')
        const normalizedPhone = identifier.replace(/[\s\-\(\)]/g, '')

        const user = await prisma.user.findFirst({
          where: isPhone
            ? { phone: normalizedPhone }
            : { email: identifier.toLowerCase() }
        })

        if (!user || !user.password) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) return null

        if (user.blocked) {
          console.warn(`[Security] Login attempt by blocked user: ${user.email}`)
          throw new UserBlockedError()
        }

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError()
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan
        }
      }
    })
  ],
  events: {
    signIn({ user }) {
      if (!user.email || !process.env.RESEND_API_KEY) return
      const resend = new Resend(process.env.RESEND_API_KEY)
      const now = new Date().toLocaleString('es-ES', {
        timeZone: 'America/Bogota',
        dateStyle: 'long',
        timeStyle: 'short'
      })
      // Fire and forget — nunca bloquear el login
      resend.emails.send({
        from: 'Kael <noreply@kael.quest>',
        to: user.email,
        subject: 'Nuevo inicio de sesión en Kael',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #050505; color: #fff; padding: 40px 20px; max-width: 480px; margin: 0 auto; border-radius: 16px;">
            <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Nuevo inicio de sesión</h1>
            <p style="color: #a1a1aa; margin-bottom: 16px;">Hola${user.name ? ` ${user.name}` : ''}, detectamos un inicio de sesión en tu cuenta.</p>
            <div style="background: #111; border: 1px solid #222; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #71717a; font-size: 13px; margin: 0 0 4px;">Fecha y hora</p>
              <p style="color: #fff; font-size: 14px; margin: 0;">${now}</p>
            </div>
            <p style="color: #52525b; font-size: 13px;">Si no fuiste tú, cambia tu contraseña inmediatamente desde tu perfil.</p>
          </div>
        `
      }).catch(() => { /* silencioso */ })
    }
  }
})