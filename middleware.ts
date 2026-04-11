import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/dashboard')) {
    // Leer el header Cookie directamente para evitar problemas con el
    // parsing de cookies __Secure- en el Edge Runtime de Next.js
    const cookieHeader = request.headers.get('cookie') ?? ''
    const hasSession = cookieHeader.includes('authjs.session-token=')

    if (!hasSession) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
