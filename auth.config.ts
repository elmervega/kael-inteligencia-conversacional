import type { NextAuthConfig } from 'next-auth'

// Edge-safe auth config — no Node.js-only modules (no bcryptjs, no prisma)
// Used by middleware.ts for JWT verification at the edge
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login'
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      if (nextUrl.pathname.startsWith('/dashboard')) {
        return isLoggedIn
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.plan = (user as any).plan
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        ;(session.user as any).plan = token.plan
      }
      return session
    }
  },
  providers: []
}
