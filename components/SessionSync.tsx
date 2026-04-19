'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

// SessionSync — cero UI, cero renders visibles.
// Escucha el estado de sesión de NextAuth y lo sincroniza con el
// almacenamiento nativo de Android (SharedPreferences vía @capacitor/preferences).
// SharedPreferences sobrevive a force-kills, battery optimization y reboots.
//
// Esto sirve como capa de respaldo al mecanismo de cookies:
// si la cookie del WebView sobrevive → sesión activa sin relogin.
// si la cookie se pierde (SIGKILL extremo) → el indicador nativo permite
// mostrar un flujo de re-login suave en lugar de una pantalla en blanco.
export default function SessionSync() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (status === 'loading') return

    if (status === 'authenticated' && session?.user) {
      // Guardar indicador + email para pre-llenar login si la sesión expira
      Preferences.set({ key: 'kael_session', value: 'active' })
      if (session.user.email) {
        Preferences.set({ key: 'kael_user_email', value: session.user.email })
      }
    } else if (status === 'unauthenticated') {
      // Limpiar al hacer logout explícito
      Preferences.remove({ key: 'kael_session' })
    }
  }, [session, status])

  return null
}
