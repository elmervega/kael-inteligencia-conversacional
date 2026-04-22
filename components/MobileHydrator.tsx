'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const TOKEN_KEY        = 'kael_mobile_token'
const LAST_HYDRATE_KEY = 'kael_last_hydrate'
const LOOP_GUARD_MS    = 5_000 // 5 segundos

export default function MobileHydrator() {
  const [isMounted, setIsMounted] = useState(false)
  const [isHydrating, setIsHydrating] = useState(false)

  const { data: session, status } = useSession()
  const wasAuthenticatedRef = useRef(false)

  // ── RESTAURACIÓN INICIAL ───────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true)

    const isNative = Capacitor.isNativePlatform()
    console.log(`🟢 [Hydrator] Montado. isNative=${isNative}`)

    if (!isNative) return

    setIsHydrating(true)

    ;(async () => {
      // ── ANTI-LOOP POR TIMESTAMP ──────────────────────────────────────
      const { value: lastHydrateRaw } = await Preferences.get({ key: LAST_HYDRATE_KEY })
      const lastHydrate = Number(lastHydrateRaw ?? 0)
      const elapsed     = Date.now() - lastHydrate

      if (lastHydrate && elapsed < LOOP_GUARD_MS) {
        console.log(`🟢 [Hydrator] Timestamp reciente (${elapsed}ms < ${LOOP_GUARD_MS}ms) — navegación post-inyección detectada.`)
        setIsHydrating(false)
        return
      }

      // ── BUSCAR TOKEN ─────────────────────────────────────────────────
      console.log('🔍 [Hydrator] Buscando token en Preferences al iniciar...')
      const { value: token } = await Preferences.get({ key: TOKEN_KEY })

      if (!token) {
        console.log('❌ [Hydrator] No se encontró token en Preferences.')
        setIsHydrating(false)
        return
      }

      console.log(`✅ [Hydrator] Token encontrado (${token.length} chars) — iniciando navegación HTTP a /api/auth/mobile-restore...`)

      // Guardar timestamp ANTES de navegar para que el guard lo encuentre
      // al montar el componente en la página destino (/dashboard).
      await Preferences.set({ key: LAST_HYDRATE_KEY, value: Date.now().toString() })

      // Patrón OAuth/Magic Link: navegación GET de primera parte.
      // El servidor valida el token, inyecta Set-Cookie httpOnly y hace 302 → /dashboard.
      // El WebView ejecuta esta navegación como una solicitud principal →
      // imposible de bloquear por CORS, Secure Context ni CookieManager async.
      window.location.href = `/api/auth/mobile-restore?token=${encodeURIComponent(token)}`
    })()
  }, [])

  // ── GUARDAR TOKEN cuando el usuario está autenticado ──────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || status === 'loading') return

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
      console.log('🔴 [Hydrator] Logout explícito — limpiando Preferences.')
      Preferences.remove({ key: TOKEN_KEY })
      Preferences.remove({ key: LAST_HYDRATE_KEY })
    }
  }, [status, session]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── EL ESCUDO ──────────────────────────────────────────────────────────
  if (!isMounted || !isHydrating) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000318]">
      <span className="text-white text-sm">Conectando Kael...</span>
    </div>
  )
}
