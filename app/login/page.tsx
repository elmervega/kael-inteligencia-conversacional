'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

type ErrorType = 'credentials' | 'rate_limit' | 'server' | 'email_not_verified' | null

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'
  const [form, setForm] = useState({ email: '', password: '' })
  const [errorType, setErrorType] = useState<ErrorType>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  const errorMessages: Record<NonNullable<ErrorType>, string> = {
    credentials: 'Email o contraseña incorrectos. Verifica tus datos.',
    rate_limit: `Demasiados intentos.${retryAfter ? ` Intenta de nuevo en ${Math.ceil(retryAfter / 60)} minuto${retryAfter > 60 ? 's' : ''}.` : ' Intenta más tarde.'}`,
    server: 'Error del servidor. Intenta de nuevo en unos momentos.',
    email_not_verified: 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorType(null)

    const res = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false
    })

    if (res?.error) {
      if (res.status === 429) {
        setErrorType('rate_limit')
      } else if (res.status && res.status >= 500) {
        setErrorType('server')
      } else if (res.error === 'email_not_verified') {
        setErrorType('email_not_verified')
      } else {
        setErrorType('credentials')
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const resendVerification = async () => {
    setResendLoading(true)
    await fetch('/api/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email })
    })
    setResendLoading(false)
    setResendDone(true)
  }

  const hasError = () => errorType === 'credentials'

  return (
    <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/20 backdrop-blur-sm">
      {justRegistered && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-4"
        >
          <span className="shrink-0 mt-0.5">✓</span>
          Cuenta creada. Inicia sesión para continuar.
        </motion.div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => { setForm({ ...form, email: e.target.value }); setErrorType(null) }}
            className={`w-full bg-zinc-900 border rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition ${
              hasError() ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
            }`}
            placeholder="tu@email.com"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Contraseña</label>
            <Link href="/forgot-password" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            type="password"
            value={form.password}
            onChange={e => { setForm({ ...form, password: e.target.value }); setErrorType(null) }}
            className={`w-full bg-zinc-900 border rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition ${
              hasError() ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
            }`}
            placeholder="Tu contraseña"
            required
          />
        </div>

        {errorType && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg text-sm ${
              errorType === 'rate_limit' || errorType === 'email_not_verified'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">
                {errorType === 'rate_limit' ? '⏳' : errorType === 'email_not_verified' ? '✉' : '⚠️'}
              </span>
              {errorMessages[errorType]}
            </div>
            {errorType === 'email_not_verified' && (
              <div className="mt-2 ml-5">
                {resendDone ? (
                  <span className="text-emerald-400 text-xs">✓ Enviado. Revisa tu bandeja de entrada.</span>
                ) : (
                  <button
                    onClick={resendVerification}
                    disabled={resendLoading}
                    className="text-xs text-amber-300 underline hover:text-amber-200 transition disabled:opacity-50"
                  >
                    {resendLoading ? 'Enviando...' : 'Reenviar enlace de verificación'}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition disabled:opacity-50"
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="text-center text-zinc-500 text-sm mt-6">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-white hover:text-zinc-300 transition">
          Crear cuenta
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
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
          <p className="text-zinc-500 mt-2 text-sm">Bienvenido de vuelta</p>
        </div>

        <Suspense fallback={
          <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/20 backdrop-blur-sm animate-pulse h-64" />
        }>
          <LoginForm />
        </Suspense>
      </motion.div>
    </main>
  )
}
