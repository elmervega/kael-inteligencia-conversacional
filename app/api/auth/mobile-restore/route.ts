import { decode } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// NextAuth v5 nombres de cookie (authjs.*, NO next-auth.*)
const COOKIE_PLAIN  = 'authjs.session-token'
const COOKIE_SECURE = '__Secure-authjs.session-token'

const MAX_AGE = 30 * 24 * 60 * 60 // 30 días en segundos

export async function POST(req: NextRequest) {
  try {
    const { mobileToken } = await req.json()
    if (!mobileToken || typeof mobileToken !== 'string') {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
    }

    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''

    // Intentar decodificar con el salt de producción primero, luego dev.
    // El mobileToken fue encodado con SESSION_COOKIE como salt en auth.config.ts.
    let payload = await decode({ token: mobileToken, secret, salt: COOKIE_SECURE })
    if (!payload?.sub) {
      payload = await decode({ token: mobileToken, secret, salt: COOKIE_PLAIN })
    }

    if (!payload?.sub) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
    }

    const expires = new Date(Date.now() + MAX_AGE * 1000)

    // ── OPCIÓN NUCLEAR: inyectar AMBAS variantes de cookie ────────────────
    // Android WebViews en distintos OEM/versiones de Chromium leen distinto.
    // Setear las dos garantiza que NextAuth encuentre la sesión sin importar
    // cuál cookie name busca primero el middleware.
    const store = await cookies()

    // Sin prefijo — para dev y como fallback en producción
    store.set(COOKIE_PLAIN, mobileToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE,
      expires,
    })

    // Con prefijo __Secure- — requerido en producción HTTPS
    // El prefijo __Secure- exige que secure=true; el browser la rechaza sin él.
    store.set(COOKIE_SECURE, mobileToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE,
      expires,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile-restore] Error inesperado:', err)
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }
}
