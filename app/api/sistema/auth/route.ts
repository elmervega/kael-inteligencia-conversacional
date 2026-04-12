import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signSistemaToken } from '@/lib/sistema-auth'
import { checkRateLimitRedis } from '@/lib/rateLimitRedis'

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown'

  // Rate limiting: 5 intentos por IP cada 15 minutos (Redis-backed)
  const { allowed } = await checkRateLimitRedis(`sistema:login:${ip}`, 5, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429 }
    )
  }

  let body: { username?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const { username, password } = body
  const validUser = process.env.SISTEMA_ADMIN_USER
  const validHash = process.env.SISTEMA_ADMIN_PASSWORD_HASH

  // Mensaje genérico: no revelar si el usuario existe o no
  const invalid = () =>
    NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })

  if (!validUser || !validHash || !username || !password) return invalid()
  if (username !== validUser) return invalid()

  const passwordOk = await bcrypt.compare(password, validHash)
  if (!passwordOk) return invalid()

  const token = await signSistemaToken(username)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('sistema-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('sistema-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return res
}
