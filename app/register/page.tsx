'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const API_ERROR_MESSAGES: Record<string, string> = {
  'An account with this email already exists.': 'Ya existe una cuenta con este email. ¿Quieres iniciar sesión?',
  'Invalid input provided. Please check your data.': 'Datos inválidos. Verifica los campos.',
  'Too many requests. Please try again later.': 'Demasiados intentos. Intenta de nuevo en unos minutos.',
}

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

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; general?: string }>({})
  const [loading, setLoading] = useState(false)
  const [isEmailTaken, setIsEmailTaken] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const newErrors: typeof errors = {}
    if (form.name.trim().length < 2) newErrors.name = 'Mínimo 2 caracteres'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Email inválido'
    if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(.{8,})$/.test(form.password)) {
      newErrors.password = 'Mínimo 8 caracteres, una mayúscula, un número y un símbolo'
    }
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsEmailTaken(false)

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setLoading(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    const data = await res.json()

    if (!res.ok) {
      const friendlyMessage = API_ERROR_MESSAGES[data.error] ?? data.error ?? 'Error al crear cuenta. Intenta de nuevo.'
      if (data.error?.includes('email already exists') || data.code === 'EMAIL_ALREADY_EXISTS') {
        setIsEmailTaken(true)
        setErrors({ email: 'Ya existe una cuenta con este email.' })
      } else if (res.status === 429) {
        setErrors({ general: 'Demasiados intentos. Intenta de nuevo en unos minutos.' })
      } else {
        setErrors({ general: friendlyMessage })
      }
      setLoading(false)
      return
    }

    setRegisteredEmail(form.email)
  }

  const fieldClass = (field: keyof typeof errors) =>
    `w-full bg-zinc-900 border rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition ${
      errors[field] ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
    }`

  if (registeredEmail) {
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
          <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/20 backdrop-blur-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-xl">
              ✉
            </div>
            <h1 className="text-xl font-bold text-white">Revisa tu correo</h1>
            <p className="text-zinc-400 text-sm">
              Enviamos un enlace de confirmación a <span className="text-zinc-200">{registeredEmail}</span>.
              Haz clic en él para activar tu cuenta.
            </p>
            <p className="text-zinc-600 text-xs">El enlace expira en 24 horas.</p>
            <Link
              href="/login"
              className="block w-full py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition mt-2"
            >
              Ir al inicio de sesión
            </Link>
          </div>
        </motion.div>
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
          <p className="text-zinc-500 mt-2 text-sm">Crea tu cuenta gratis</p>
        </div>

        <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/20 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setErrors(p => ({ ...p, name: undefined })) }}
                className={fieldClass('name')}
                placeholder="Tu nombre"
                required
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); setErrors(p => ({ ...p, email: undefined })); setIsEmailTaken(false) }}
                className={fieldClass('email')}
                placeholder="tu@email.com"
                required
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.email}
                  {isEmailTaken && (
                    <> — <Link href="/login" className="underline hover:text-red-300">Iniciar sesión</Link></>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); setErrors(p => ({ ...p, password: undefined })) }}
                  className={`${fieldClass('password')} pr-11`}
                  placeholder="Mínimo 8 caracteres"
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
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                <span className="shrink-0 mt-0.5">⚠️</span>
                {errors.general}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-white hover:text-zinc-300 transition">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  )
}
