'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const TOKEN_KEY = 'kael_auth_token'
const EMAIL_KEY = 'kael_user_email'
const MAX_AGE = 30 * 24 * 60 * 60 // 30 días en segundos

// ─── SessionHydrator ────────────────────────────────────────────────────────
//
// Problema: Android puede destruir el WebView storage (cookies) con SIGKILL.
// `document.cookie` NO puede leer cookies httpOnly → no se pueden guardar
// directamente desde JS. Este componente usa un endpoint server-side que
// sí puede leer la cookie httpOnly y retransmite el JWT al Preferences nativo.
//
// Flujo de guardado (auth → Preferences):
//   1. NextAuth autentica → status = 'authenticated'
//   2. Fetch a /api/mobile/session-token (server lee la cookie httpOnly)
//   3. JWT guardado en Android SharedPreferences (sobrevive SIGKILL)
//
// Flujo de rehidratación (Preferences → cookie → sesión):
//   1. App abre sin cookies (SIGKILL destruyó el WebView storage)
//   2. status = 'unauthenticated' + sin intento previo → leer Preferences
//   3. JWT encontrado → inyectar como document.cookie (sin httpOnly — aceptable
//      en WebView nativo que solo carga nuestro dominio)
//   4. update() fuerza a NextAuth a releer las cookies → sesión restaurada
//
// Flujo de cierre de sesión (logout → limpiar Preferences):
//   1. Usuario hace logout explícito → status = 'unauthenticated'
//   2. wasAuthenticated = true → es un logout real → limpiar Preferences
//
export default function SessionHydrator() {
  const { data: session, status, update } = useSession()
  const wasAuthenticatedRef = useRef(false)
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (status === 'loading') return

    ;(async () => {
      // ── AUTENTICADO: guardar JWT en Preferences ──────────────────────────
      if (status === 'authenticated') {
        wasAuthenticatedRef.current = true

        try {
          const res = await fetch('/api/mobile/session-token')
          if (!res.ok) return
          const data = await res.json()
          if (!data.token) return

          await Preferences.set({ key: TOKEN_KEY, value: data.token })

          if (session?.user?.email) {
            await Preferences.set({ key: EMAIL_KEY, value: session.user.email })
          }
        } catch {
          // silencioso — no bloquear UX si falla
        }
        return
      }

      // ── DESAUTENTICADO ───────────────────────────────────────────────────
      if (wasAuthenticatedRef.current) {
        // Llegó aquí después de estar autenticado → logout explícito → limpiar
        await Preferences.remove({ key: TOKEN_KEY })
        return
      }

      // Primera vez sin sesión (app abrió sin cookies) → intentar rehidratar
      if (hasRestoredRef.current) return
      hasRestoredRef.current = true

      const { value: token } = await Preferences.get({ key: TOKEN_KEY })
      if (!token) return

      // Inyectar JWT como cookie no-httpOnly.
      // NextAuth valida la firma JWT server-side → no puede ser forjado.
      // Sin httpOnly es aceptable aquí: WebView nativo solo carga nuestro dominio.
      document.cookie = [
        `authjs.session-token=${token}`,
        'path=/',
        `max-age=${MAX_AGE}`,
        'SameSite=Lax',
      ].join('; ')

      document.cookie = [
        `__Secure-authjs.session-token=${token}`,
        'path=/',
        `max-age=${MAX_AGE}`,
        'SameSite=Lax',
        'Secure',
      ].join('; ')

      // Forzar a NextAuth a releer cookies → actualiza status a 'authenticated'
      await update()
    })()
  }, [status, session?.user?.email])

  return null
}
