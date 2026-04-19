'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const TOKEN_KEY = 'kael_mobile_token'

export default function MobileHydrator() {
  const { data: session, status } = useSession()
  const wasAuthenticatedRef = useRef(false)
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (status === 'loading') return

    ;(async () => {
      // ── AUTENTICADO: guardar mobileToken en SharedPreferences ────────────
      if (status === 'authenticated') {
        wasAuthenticatedRef.current = true

        const mobileToken = (session as any)?.mobileToken
        if (!mobileToken) return

        try {
          await Preferences.set({ key: TOKEN_KEY, value: mobileToken })
        } catch {
          // silencioso
        }
        return
      }

      // ── DESAUTENTICADO ───────────────────────────────────────────────────
      if (wasAuthenticatedRef.current) {
        // Logout explícito → limpiar token guardado
        await Preferences.remove({ key: TOKEN_KEY })
        return
      }

      // Primera apertura sin sesión → intentar restaurar
      if (hasRestoredRef.current) return
      hasRestoredRef.current = true

      const { value: token } = await Preferences.get({ key: TOKEN_KEY })
      if (!token) return

      try {
        const res = await fetch('/api/auth/mobile-restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobileToken: token }),
        })

        if (res.ok) {
          window.location.reload()
        }
      } catch {
        // silencioso
      }
    })()
  }, [status, session])

  return null
}
