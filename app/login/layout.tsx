// app/login/layout.tsx
// Las páginas 'use client' no pueden exportar metadata directamente.
// Este layout server component actúa como wrapper y aporta el título
// que el template '%s | Kael' convierte en "Iniciar sesión | Kael".
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta de Kael — tu asistente de IA conversacional.',
  robots: { index: false },   // páginas de auth no deben indexarse
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
