'use client'

import { SessionProvider } from 'next-auth/react'
import SessionHydrator from '@/components/SessionHydrator'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* SessionHydrator: guarda el JWT en Preferences nativo y lo rehidrata
          al abrir la app si Android destruyó el WebView storage (SIGKILL) */}
      <SessionHydrator />
      {children}
    </SessionProvider>
  )
}
