'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

type ErrorType = 'credentials' | 'rate_limit' | 'server' | 'email_not_verified' | null

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'
  const [form, setForm] = useState({ email: '', password: '' })
  const [errorType, setErrorType] = useState<ErrorType>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

    try {
      // Step 1: Fetch CSRF token — this ALSO sets the CSRF cookie server-side
      const csrfRes = await fetch('/api/auth/csrf')
      const { csrfToken } = await csrfRes.json()

      // Step 2: POST credentials with the CSRF token matching the cookie
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Auth-Return-Redirect': '1',
        },
        body: new URLSearchParams({
          csrfToken,
          email: form.email,
          password: form.password,
          callbackUrl: '/dashboard',
          json: 'true',
        }),
      })

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}))
        setRetryAfter(data.retryAfter ?? null)
        setErrorType('rate_limit')
        setLoading(false)
        return
      }

      if (res.status >= 500) {
        setErrorType('server')
        setLoading(false)
        return
      }

      // NextAuth v5 with json:true returns { url: '...' }
      const data = await res.json().catch(() => ({}))
      const redirectUrl: string = data.url ?? ''

      if (redirectUrl.includes('error=')) {
        const parsedUrl = new URL(redirectUrl, window.location.origin)
        const errorParam = parsedUrl.searchParams.get('error') ?? ''
        const codeParam = parsedUrl.searchParams.get('code') ?? ''
        if (errorParam === 'email_not_verified' || codeParam === 'email_not_verified') {
          setErrorType('email_not_verified')
        } else {
          setErrorType('credentials')
        }
        setLoading(false)
        return
      }

      // Success — full page redirect so middleware reads fresh session cookie
      window.location.href = '/dashboard'
    } catch {
      setErrorType('server')
      setLoading(false)
    }
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
          <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Email o teléfono</label>
          <input
            type="text"
            value={form.email}
            onChange={e => { setForm({ ...form, email: e.target.value }); setErrorType(null) }}
            className={`w-full bg-zinc-900 border rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition ${
              hasError() ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
            }`}
            placeholder="tu@email.com o +1234567890"
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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => { setForm({ ...form, password: e.target.value }); setErrorType(null) }}
              className={`w-full bg-zinc-900 border rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder-zinc-600 focus:outline-none transition ${
                hasError() ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
              }`}
              placeholder="Tu contraseña"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
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
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition text-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Volver al inicio
          </Link>
        </div>
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
