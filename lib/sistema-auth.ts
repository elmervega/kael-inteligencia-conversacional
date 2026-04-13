import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

function getSecret(): Uint8Array {
  const secret = process.env.SISTEMA_JWT_SECRET
  if (!secret) throw new Error('SISTEMA_JWT_SECRET no configurado')
  return new TextEncoder().encode(secret)
}

export async function signSistemaToken(username: string): Promise<string> {
  return new SignJWT({ sub: username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifySistemaToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

/** Leer cookie sistema-session y verificar JWT. Usar en rutas /api/sistema/* */
export async function requireSistemaAuth(): Promise<boolean> {
  try {
    const store = await cookies()
    const token = store.get('sistema-session')?.value
    if (!token) return false
    return verifySistemaToken(token)
  } catch {
    return false
  }
}
