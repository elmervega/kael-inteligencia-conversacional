import { decode } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const COOKIE_SECURE = '__Secure-authjs.session-token'
const COOKIE_PLAIN  = 'authjs.session-token'

export async function POST(req: NextRequest) {
  try {
    const { mobileToken } = await req.json()
    if (!mobileToken || typeof mobileToken !== 'string') {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
    }

    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''

    // Validar firma JWT — previene que cualquier string arbitrario pase.
    // El cliente inyecta la cookie vía CapacitorCookies (nativo), no el servidor.
    let payload = await decode({ token: mobileToken, secret, salt: COOKIE_SECURE })
    if (!payload?.sub) {
      payload = await decode({ token: mobileToken, secret, salt: COOKIE_PLAIN })
    }

    if (!payload?.sub) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
    }

    // Retornar el token validado — el cliente (CapacitorCookies) lo inyecta.
    return NextResponse.json({ success: true, token: mobileToken })
  } catch (err) {
    console.error('[mobile-restore] Error:', err)
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }
}
