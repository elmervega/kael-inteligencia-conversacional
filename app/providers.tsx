'use client'

import { SessionProvider } from 'next-auth/react'
import MobileHydrator from '@/components/MobileHydrator'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MobileHydrator />
      {children}
    </SessionProvider>
  )
}
