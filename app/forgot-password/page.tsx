'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })

    setLoading(false)

    if (res.status === 429) {
      setError('Demasiados intentos. Intenta de nuevo en unos minutos.')
      return
    }

    // Always show success (prevents email enumeration)
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Kael
          </Link>
          <p className="text-zinc-500 mt-2 text-sm">Recuperar contraseña</p>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/20 backdrop-blur-sm">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h2 className="text-lg font-semibold">Revisa tu correo</h2>
              <p className="text-zinc-400 text-sm">
                Si existe una cuenta con <span className="text-white">{email}</span>, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <p className="text-zinc-600 text-xs">El enlace expira en 1 hora.</p>
              <Link
                href="/login"
                className="block text-center text-sm text-zinc-400 hover:text-white transition mt-4"
              >
                ← Volver al inicio de sesión
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-zinc-400 text-sm mb-4">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"
                >
                  <span className="shrink-0 mt-0.5">⏳</span>
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>

              <p className="text-center">
                <Link href="/login" className="text-zinc-500 text-sm hover:text-zinc-300 transition">
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  )
}
