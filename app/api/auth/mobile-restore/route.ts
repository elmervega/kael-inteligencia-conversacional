import { decode } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const COOKIE_SECURE = '__Secure-authjs.session-token'
const COOKIE_PLAIN  = 'authjs.session-token'
const MAX_AGE       = 30 * 24 * 60 * 60

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login', 'https://kael.quest'))
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''

  // Validar firma antes de inyectar — evita aceptar tokens arbitrarios.
  let payload = await decode({ token, secret, salt: COOKIE_SECURE })
  if (!payload?.sub) {
    payload = await decode({ token, secret, salt: COOKIE_PLAIN })
  }

  if (!payload?.sub) {
    return NextResponse.redirect(new URL('/login', 'https://kael.quest'))
  }

  const store = await cookies()

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE, // Obligatorio: fuerza almacenamiento en disco en Android WebView
  }

  // Inyectar ambas variantes vía Set-Cookie en una navegación de primera parte.
  // El WebView trata estos headers igual que cualquier respuesta del servidor →
  // no puede bloquearlos por CORS ni por restricciones de Secure Context.
  store.set(COOKIE_PLAIN,  token, cookieOptions)
  store.set(COOKIE_SECURE, token, cookieOptions)

  // 302 → el WebView navega al dashboard ya con las cookies en el jar nativo.
  return NextResponse.redirect(new URL('/dashboard', 'https://kael.quest'))
}
