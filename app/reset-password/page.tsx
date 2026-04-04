'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const passwordValid = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(.{8,})$/.test(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!passwordValid) {
      setError('Mínimo 8 caracteres, una mayúscula, un número y un símbolo.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Ocurrió un error. Intenta de nuevo.')
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Enlace inválido o expirado.</p>
          <Link href="/forgot-password" className="text-white underline text-sm">
            Solicitar nuevo enlace
          </Link>
        </div>
      </main>
    )
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
          <p className="text-zinc-500 mt-2 text-sm">Nueva contraseña</p>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/20 backdrop-blur-sm">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h2 className="text-lg font-semibold">Contraseña actualizada</h2>
              <p className="text-zinc-400 text-sm">
                Tu contraseña fue cambiada exitosamente. Redirigiendo al inicio de sesión...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  className={`w-full bg-zinc-900 border rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition ${
                    error && error.includes('contraseña') ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
                  }`}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                {password && !passwordValid && (
                  <p className="text-zinc-500 text-xs mt-1">Mínimo 8 caracteres, una mayúscula, un número y un símbolo</p>
                )}
              </div>

              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(null) }}
                  className={`w-full bg-zinc-900 border rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition ${
                    confirm && confirm !== password ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
                  }`}
                  placeholder="Repite tu contraseña"
                  required
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                >
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  {error}
                  {error.includes('expiró') && (
                    <Link href="/forgot-password" className="ml-auto text-red-300 underline whitespace-nowrap text-xs">
                      Nuevo enlace →
                    </Link>
                  )}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  )
}
