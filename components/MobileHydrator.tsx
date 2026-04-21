'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Preferences } from '@capacitor/preferences'
import { Capacitor, CapacitorCookies } from '@capacitor/core'

const TOKEN_KEY        = 'kael_mobile_token'
const LAST_HYDRATE_KEY = 'kael_last_hydrate'
const LOOP_GUARD_MS    = 10_000 // 10 segundos
const DOMAIN           = 'kael.quest'

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
      // Si el reload() post-inyección activa este useEffect de nuevo,
      // el timestamp estará dentro de la ventana de 10s → abortar.
      // Sobrevive a force-kill (Preferences persisten) pero la ventana es
      // tan corta que en la siguiente apertura real ya habrá expirado.
      const { value: lastHydrateRaw } = await Preferences.get({ key: LAST_HYDRATE_KEY })
      const lastHydrate = Number(lastHydrateRaw ?? 0)
      const elapsed = Date.now() - lastHydrate

      if (lastHydrate && elapsed < LOOP_GUARD_MS) {
        console.log(`🟢 [Hydrator] Timestamp reciente (${elapsed}ms < ${LOOP_GUARD_MS}ms) — reload post-inyección, sin re-intentar.`)
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

      console.log(`✅ [Hydrator] Token encontrado (${token.length} chars), llamando a /api/auth/mobile-restore...`)

      try {
        const res = await fetch('/api/auth/mobile-restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobileToken: token }),
        })

        console.log(`✅ [Hydrator] Respuesta de /api/auth/mobile-restore: status=${res.status}`)

        if (res.ok) {
          const data = await res.json()

          console.log('🍪 [Hydrator] Cookies antes de inyectar:', document.cookie || '(vacío)')

          await CapacitorCookies.setCookie({
            url: `https://${DOMAIN}`,
            key: '__Secure-authjs.session-token',
            value: data.token,
          })
          await CapacitorCookies.setCookie({
            url: `https://${DOMAIN}`,
            key: 'authjs.session-token',
            value: data.token,
          })

          const cookiesAfter = await CapacitorCookies.getCookies({ url: `https://${DOMAIN}` })
          console.log('🍪 [Hydrator] Cookies después de inyectar:', JSON.stringify(cookiesAfter))

          console.log('⏳ [Hydrator] Esperando flush del CookieManager (1s)...')
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Guardar timestamp ANTES del reload — el anti-loop lo leerá en el siguiente montaje.
          await Preferences.set({ key: LAST_HYDRATE_KEY, value: Date.now().toString() })

          console.log('✅ [Hydrator] Timestamp guardado — recargando...')
          window.location.reload()
        } else {
          const body = await res.text()
          console.log(`❌ [Hydrator] Token inválido/expirado (${res.status}): ${body} — limpiando.`)
          await Preferences.remove({ key: TOKEN_KEY })
          setIsHydrating(false)
        }
      } catch (err) {
        console.log('❌ [Hydrator] Error en fetch:', err)
        setIsHydrating(false)
      }
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
