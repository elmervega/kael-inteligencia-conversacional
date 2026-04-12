import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

async function verifySistemaJWT(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.SISTEMA_JWT_SECRET ?? '')
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protección del panel de sistema (JWT propio, independiente de NextAuth)
  const isSistemaPage = pathname.startsWith('/dashboard-sistema')
  const isSistemaApi = pathname.startsWith('/api/sistema/') && !pathname.startsWith('/api/sistema/auth')

  if (isSistemaPage || isSistemaApi) {
    const token = request.cookies.get('sistema-session')?.value

    if (!token || !(await verifySistemaJWT(token))) {
      // API routes retornan JSON 401 — páginas redirigen al login
      if (isSistemaApi) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/sistema/login', request.url))
    }
    return NextResponse.next()
  }

  // Protección del dashboard de Kael (NextAuth session cookie)
  if (pathname.startsWith('/dashboard')) {
    const cookieHeader = request.headers.get('cookie') ?? ''
    const hasSession = cookieHeader.includes('authjs.session-token=')
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard-sistema',
    '/dashboard-sistema/:path*',
    '/api/sistema/:path*',
  ],
}
