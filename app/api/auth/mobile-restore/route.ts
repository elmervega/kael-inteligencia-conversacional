import { decode } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SESSION_COOKIE =
  process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

export async function POST(req: NextRequest) {
  try {
    const { mobileToken } = await req.json()
    if (!mobileToken || typeof mobileToken !== 'string') {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 })
    }

    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
    const payload = await decode({ token: mobileToken, secret, salt: SESSION_COOKIE })

    if (!payload?.sub) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
    }

    const maxAge = 30 * 24 * 60 * 60

    const store = await cookies()
    store.set(SESSION_COOKIE, mobileToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }
}
