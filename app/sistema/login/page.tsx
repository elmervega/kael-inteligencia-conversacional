'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SistemaLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/sistema/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      router.push('/dashboard-sistema')
    } else if (res.status === 429) {
      setError('Demasiados intentos. Espera 15 minutos.')
      setLoading(false)
    } else {
      setError('Credenciales incorrectas')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl mx-auto mb-4">
            🛡️
          </div>
          <h1 className="text-xl font-bold text-white">Panel de Sistema</h1>
          <p className="text-zinc-500 text-sm mt-1">Acceso restringido</p>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-900/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
                Usuario
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => { setForm({ ...form, username: e.target.value }); setError(null) }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => { setForm({ ...form, password: e.target.value }); setError(null) }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">
          Sesión expira en 8 horas
        </p>
      </div>
    </main>
  )
}
