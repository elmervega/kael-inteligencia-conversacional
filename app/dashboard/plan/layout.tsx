import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Plan',
  robots: { index: false },
}

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
