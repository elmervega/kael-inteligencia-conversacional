'use client'

import { SessionProvider } from 'next-auth/react'
import SessionSync from '@/components/SessionSync'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* SessionSync: sincroniza sesión activa a SharedPreferences nativo de Android */}
      <SessionSync />
      {children}
    </SessionProvider>
  )
}