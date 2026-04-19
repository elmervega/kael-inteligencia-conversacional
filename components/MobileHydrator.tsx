'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const TOKEN_KEY = 'kael_mobile_token'
// sessionStorage persiste en reload() pero se borra al matar la app.
// Evita el loop: restore → reload → restore → reload infinito.
const HYDRATED_KEY = 'kael_hydrated'

export default function MobileHydrator() {
  const isNative = Capacitor.isNativePlatform()

  // En nativo arrancamos bloqueando. En web nunca bloqueamos.
  const [isHydrating, setIsHydrating] = useState(() => {
    try { return Capacitor.isNativePlatform() } catch { return false }
  })

  const { data: session, status } = useSession()
  const wasAuthenticatedRef = useRef(false)

  // ── RESTAURACIÓN INICIAL (solo al montar, una vez) ────────────────────
  useEffect(() => {
    console.log(`🟢 [Hydrator] Montado. isNative=${isNative} | isHydrating=${isHydrating}`)
    if (!isNative) return

    // Si ya restauramos en este ciclo de vida del WebView, soltar el escudo.
    if (sessionStorage.getItem(HYDRATED_KEY)) {
      console.log('🟢 [Hydrator] Ya restaurado en esta sesión (sessionStorage) — liberando escudo.')
      setIsHydrating(false)
      return
    }

    ;(async () => {
      console.log('🔍 [Hydrator] Buscando token en Preferences al iniciar...')
      const { value: token } = await Preferences.get({ key: TOKEN_KEY })

      if (!token) {
        console.log('❌ [Hydrator] No se encontró token en Preferences.')
        setIsHydrating(false)
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
          // Marcar que ya restauramos ANTES del reload para romper el loop.
          sessionStorage.setItem(HYDRATED_KEY, '1')
          console.log('✅ [Hydrator] Restauración exitosa — recargando página...')
          window.location.reload()
        } else {
          const body = await res.text()
          console.log(`❌ [Hydrator] Token inválido/expirado (${res.status}): ${body} — limpiando.`)
          await Preferences.remove({ key: TOKEN_KEY })
          setIsHydrating(false)
        }
      } catch (err) {
        console.log('❌ [Hydrator] Error en fetch a /api/auth/mobile-restore:', err)
        setIsHydrating(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── GUARDAR TOKEN cuando el usuario está autenticado ──────────────────
  useEffect(() => {
    if (!isNative || status === 'loading') return

    if (status === 'authenticated') {
      wasAuthenticatedRef.current = true
      const mobileToken = (session as any)?.mobileToken
      console.log(`💾 [Hydrator] Intento de guardado. user=${session?.user?.email} | mobileToken: ${!!mobileToken}`)

      if (!mobileToken) {
        console.log('💾 [Hydrator] ⚠️ mobileToken ausente — no se guardó nada.')
        return
      }

      Preferences.set({ key: TOKEN_KEY, value: mobileToken })
        .then(() => console.log('💾 [Hydrator] ✅ Token guardado en SharedPreferences'))
        .catch((err) => console.log('💾 [Hydrator] ❌ Error al guardar:', err))
      return
    }

    if (wasAuthenticatedRef.current) {
      console.log('🔴 [Hydrator] Logout explícito — limpiando Preferences y sessionStorage.')
      Preferences.remove({ key: TOKEN_KEY })
      sessionStorage.removeItem(HYDRATED_KEY)
    }
  }, [status, session]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── EL ESCUDO ──────────────────────────────────────────────────────────
  if (isHydrating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000318]">
        <span className="text-white text-sm">Conectando Kael...</span>
      </div>
    )
  }

  return null
}
