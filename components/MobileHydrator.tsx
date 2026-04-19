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
    const isNative = Capacitor.isNativePlatform()
    console.log(`🟢 [Hydrator] Componente montado. ¿Es Nativo?: ${isNative} | status: ${status}`)

    if (!isNative) {
      console.log('🟢 [Hydrator] No es plataforma nativa — saliendo.')
      return
    }
    if (status === 'loading') {
      console.log('🟢 [Hydrator] status = loading — esperando...')
      return
    }

    ;(async () => {
      // ── AUTENTICADO: guardar mobileToken en SharedPreferences ────────────
      if (status === 'authenticated') {
        wasAuthenticatedRef.current = true

        const mobileToken = (session as any)?.mobileToken
        console.log(`💾 [Hydrator] Intento de guardado. Sesión actual: user=${session?.user?.email} | mobileToken present: ${!!mobileToken}`)

        if (!mobileToken) {
          console.log('💾 [Hydrator] ⚠️ mobileToken es null/undefined — no se guardó nada.')
          return
        }

        try {
          await Preferences.set({ key: TOKEN_KEY, value: mobileToken })
          console.log(`💾 [Hydrator] ✅ Token guardado en SharedPreferences (key: ${TOKEN_KEY})`)
        } catch (err) {
          console.log('💾 [Hydrator] ❌ Error al guardar en Preferences:', err)
        }
        return
      }

      // ── DESAUTENTICADO ───────────────────────────────────────────────────
      if (wasAuthenticatedRef.current) {
        console.log('🔴 [Hydrator] Logout explícito detectado — limpiando Preferences.')
        await Preferences.remove({ key: TOKEN_KEY })
        return
      }

      // Primera apertura sin sesión → intentar restaurar
      if (hasRestoredRef.current) {
        console.log('🔍 [Hydrator] Restauración ya intentada en esta sesión — saliendo.')
        return
      }
      hasRestoredRef.current = true

      console.log('🔍 [Hydrator] Buscando token en Preferences al iniciar...')
      const { value: token } = await Preferences.get({ key: TOKEN_KEY })

      if (!token) {
        console.log('❌ [Hydrator] No se encontró token en Preferences.')
        return
      }

      console.log(`✅ [Hydrator] Token encontrado (${token.length} chars), llamando a /api/auth/mobile-restore...`)

      try {
        const res = await fetch('/api/auth/mobile-restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobileToken: token }),
        })

        console.log(`✅ [Hydrator] Respuesta de /api/auth/mobile-restore: status=${res.status}`)

        if (res.ok) {
          console.log('✅ [Hydrator] Restauración exitosa — recargando página...')
          window.location.reload()
        } else {
          const body = await res.text()
          console.log(`❌ [Hydrator] Restauración fallida. Body: ${body}`)
        }
      } catch (err) {
        console.log('❌ [Hydrator] Error en fetch a /api/auth/mobile-restore:', err)
      }
    })()
  }, [status, session])

  return null
}
