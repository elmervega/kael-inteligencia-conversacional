import type { NextAuthConfig } from 'next-auth'
import { encode } from 'next-auth/jwt'

// encode usa jose (Web Crypto API) → Edge-compatible ✓
// No importa Node.js-only modules

// Nombre de la cookie de sesión según entorno.
// NextAuth v5 agrega __Secure- prefix en producción HTTPS.
// Este mismo nombre se usa como "salt" al codificar/decodificar el JWT.
const SESSION_COOKIE =
  process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

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

        // mobileToken: JWT re-codificado con 30 días de vida.
        // El cliente (MobileHydrator) lo guarda en Preferences nativo de Android.
        // Cuando Android destruye el WebView (SIGKILL), el token persiste en
        // SharedPreferences y se usa para restaurar la sesión sin relogin.
        // encode() usa el mismo NEXTAUTH_SECRET y salt (cookie name) que NextAuth
        // → /api/auth/mobile-restore puede validarlo con decode() sin DB.
        try {
          const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
          ;(session as any).mobileToken = await encode({
            token,
            secret,
            salt: SESSION_COOKIE,
            maxAge: 30 * 24 * 60 * 60,
          })
        } catch {
          // No bloquear la sesión si el encode falla
        }
      }
      return session
    }
  },
  providers: []
}
