import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/dashboard')) {
    // Fast check: if no session cookie at all, redirect immediately.
    // Real JWT validation happens in app/dashboard/layout.tsx via auth()
    // from lib/auth.ts which has trustHost + full config.
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
