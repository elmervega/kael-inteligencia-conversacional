'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Preferences } from '@capacitor/preferences'
import { Capacitor, CapacitorCookies } from '@capacitor/core'

const TOKEN_KEY   = 'kael_mobile_token'
const HYDRATED_KEY = 'kael_hydrated'
const DOMAIN      = 'kael.quest'

export default function MobileHydrator() {
  // isMounted: evita hydration mismatch — SSR siempre renderiza null.
  const [isMounted, setIsMounted] = useState(false)
  // isHydrating: escudo visual mientras restauramos la sesión en nativo.
  const [isHydrating, setIsHydrating] = useState(false)

  const { data: session, status } = useSession()
  const wasAuthenticatedRef = useRef(false)

  // ── RESTAURACIÓN INICIAL ───────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true)

    const isNative = Capacitor.isNativePlatform()
    console.log(`🟢 [Hydrator] Montado. isNative=${isNative}`)

    if (!isNative) return

    // Si ya restauramos en este ciclo de vida del WebView, no bloquear.
    if (sessionStorage.getItem(HYDRATED_KEY)) {
      console.log('🟢 [Hydrator] Ya restaurado en esta sesión — sin bloqueo.')
      return
    }

    // Activar escudo y buscar token.
    setIsHydrating(true)

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
          const data = await res.json()

          // Verificación previa: ¿qué cookies ve el WebView ahora?
          console.log('🍪 [Hydrator] Cookies antes de inyectar:', document.cookie || '(vacío)')

          // Inyectar ambas variantes vía motor nativo Android (CookieManager).
          // URL debe coincidir EXACTAMENTE con el origen de la app.
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

          // Verificación posterior: confirmar que el motor nativo las registró.
          const cookiesAfter = await CapacitorCookies.getCookies({ url: `https://${DOMAIN}` })
          console.log('🍪 [Hydrator] Cookies después de inyectar:', JSON.stringify(cookiesAfter))

          // Pausa de sincronización: el CookieManager de Android es asíncrono
          // a nivel de I/O. Sin este delay, el reload() puede dispararse antes
          // de que las cookies lleguen al WebView y NextAuth no las encuentra.
          console.log('⏳ [Hydrator] Esperando flush del CookieManager (1s)...')
          await new Promise(resolve => setTimeout(resolve, 1000))

          console.log('✅ [Hydrator] Flush completado — recargando...')
          sessionStorage.setItem(HYDRATED_KEY, '1')
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
  }, []) // solo al montar

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
      console.log('🔴 [Hydrator] Logout explícito — limpiando Preferences y sessionStorage.')
      Preferences.remove({ key: TOKEN_KEY })
      sessionStorage.removeItem(HYDRATED_KEY)
    }
  }, [status, session]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── EL ESCUDO ──────────────────────────────────────────────────────────
  // SSR: isMounted=false → null (sin hydration mismatch)
  // Web: isMounted=true, isHydrating=false → null
  // Nativo restaurando: isMounted=true, isHydrating=true → overlay
  if (!isMounted || !isHydrating) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000318]">
      <span className="text-white text-sm">Conectando Kael...</span>
    </div>
  )
}
