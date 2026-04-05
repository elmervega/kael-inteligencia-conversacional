'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

type Status = 'loading' | 'success' | 'invalid' | 'expired'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }

    fetch('/api/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setStatus('success')
        else if (d.error === 'TOKEN_EXPIRED') setStatus('expired')
        else setStatus('invalid')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-8">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Kael
          </Link>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/20 backdrop-blur-sm">
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800 animate-pulse mx-auto" />
              <p className="text-zinc-400 text-sm">Verificando tu email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-xl">
                ✓
              </div>
              <h1 className="text-xl font-bold text-white">Email confirmado</h1>
              <p className="text-zinc-400 text-sm">Tu cuenta está activa. Ya puedes iniciar sesión.</p>
              <Link
                href="/login"
                className="block w-full py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition mt-2"
              >
                Iniciar sesión
              </Link>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-xl">
                ⏱
              </div>
              <h1 className="text-xl font-bold text-white">Enlace expirado</h1>
              <p className="text-zinc-400 text-sm">El enlace de verificación expiró (24 horas). Crea una nueva cuenta para recibir un enlace nuevo.</p>
              <Link
                href="/register"
                className="block w-full py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition mt-2"
              >
                Registrarse de nuevo
              </Link>
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto text-xl">
                ✕
              </div>
              <h1 className="text-xl font-bold text-white">Enlace no válido</h1>
              <p className="text-zinc-400 text-sm">Este enlace de verificación no existe o ya fue usado.</p>
              <Link
                href="/login"
                className="block w-full py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition mt-2"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
      </main>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
