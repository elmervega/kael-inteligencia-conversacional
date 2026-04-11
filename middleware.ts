import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/dashboard')) {
    // Chequeo rápido de existencia de cookie — la verificación JWT real
    // ocurre en app/dashboard/layout.tsx vía auth() de lib/auth.ts
    const hasSession =
      request.cookies.has('__Secure-authjs.session-token') ||
      request.cookies.has('authjs.session-token')

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
