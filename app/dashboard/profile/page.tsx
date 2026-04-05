'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

type Field = 'name' | 'email' | 'password'
type Status = { type: 'success' | 'error'; message: string } | null

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-900/20">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-5">{title}</h2>
      {children}
    </div>
  )
}

function StatusMsg({ status }: { status: Status }) {
  if (!status) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 p-3 rounded-lg text-sm mt-3 ${
        status.type === 'success'
          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/10 border border-red-500/30 text-red-400'
      }`}
    >
      <span>{status.type === 'success' ? '✓' : '⚠️'}</span>
      {status.message}
    </motion.div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<{ name: string; email: string; plan: string; createdAt: string } | null>(null)

  // Name
  const [name, setName] = useState('')
  const [nameStatus, setNameStatus] = useState<Status>(null)
  const [nameLoading, setNameLoading] = useState(false)

  // Email
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<Status>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  // Password
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })
  const [pwdStatus, setPwdStatus] = useState<Status>(null)
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      setProfile(d)
      setName(d.name ?? '')
      setEmail(d.email ?? '')
    })
  }, [])

  const saveName = async () => {
    if (name.trim().length < 2) { setNameStatus({ type: 'error', message: 'Mínimo 2 caracteres.' }); return }
    setNameLoading(true)
    setNameStatus(null)
    const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    const d = await res.json()
    setNameLoading(false)
    if (res.ok) {
      setNameStatus({ type: 'success', message: 'Nombre actualizado.' })
      router.refresh()
    } else {
      setNameStatus({ type: 'error', message: d.message ?? d.error ?? 'Error al guardar.' })
    }
  }

  const saveEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailStatus({ type: 'error', message: 'Email inválido.' }); return }
    setEmailLoading(true)
    setEmailStatus(null)
    const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const d = await res.json()
    setEmailLoading(false)
    if (res.ok) {
      setEmailStatus({ type: 'success', message: 'Email actualizado.' })
    } else {
      setEmailStatus({ type: 'error', message: d.message ?? d.error ?? 'Error al guardar.' })
    }
  }

  const savePassword = async () => {
    if (!pwd.current) { setPwdStatus({ type: 'error', message: 'Ingresa tu contraseña actual.' }); return }
    if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(.{8,})$/.test(pwd.new)) {
      setPwdStatus({ type: 'error', message: 'Mínimo 8 caracteres, una mayúscula, un número y un símbolo.' }); return
    }
    if (pwd.new !== pwd.confirm) { setPwdStatus({ type: 'error', message: 'Las contraseñas no coinciden.' }); return }
    setPwdLoading(true)
    setPwdStatus(null)
    const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.new }) })
    const d = await res.json()
    setPwdLoading(false)
    if (res.ok) {
      setPwdStatus({ type: 'success', message: 'Contraseña actualizada correctamente.' })
      setPwd({ current: '', new: '', confirm: '' })
    } else {
      setPwdStatus({ type: 'error', message: d.message ?? d.error ?? 'Error al cambiar contraseña.' })
    }
  }

  const inputClass = (hasError?: boolean) =>
    `w-full bg-zinc-900 border rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition ${
      hasError ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
    }`

  const btnClass = 'px-5 py-2.5 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-100 transition disabled:opacity-50'

  if (!profile) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-32 bg-zinc-800 rounded-2xl" />
          <div className="h-32 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Mi Perfil</h1>
        <p className="text-zinc-500 text-sm">Miembro desde {memberSince} · Plan <span className={profile.plan === 'pro' ? 'text-violet-400' : 'text-zinc-400'}>{profile.plan === 'pro' ? '💎 Pro' : 'Free'}</span></p>
      </div>

      <div className="space-y-5">
        {/* Nombre */}
        <Section title="Nombre">
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameStatus(null) }}
              className={inputClass()}
              placeholder="Tu nombre"
            />
            <button onClick={saveName} disabled={nameLoading || name === profile.name} className={btnClass}>
              {nameLoading ? '...' : 'Guardar'}
            </button>
          </div>
          <StatusMsg status={nameStatus} />
        </Section>

        {/* Email */}
        <Section title="Email">
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailStatus(null) }}
              className={inputClass()}
              placeholder="tu@email.com"
            />
            <button onClick={saveEmail} disabled={emailLoading || email === profile.email} className={btnClass}>
              {emailLoading ? '...' : 'Guardar'}
            </button>
          </div>
          <StatusMsg status={emailStatus} />
        </Section>

        {/* Contraseña */}
        <Section title="Contraseña">
          <div className="space-y-3">
            <input
              type="password"
              value={pwd.current}
              onChange={e => { setPwd(p => ({ ...p, current: e.target.value })); setPwdStatus(null) }}
              className={inputClass()}
              placeholder="Contraseña actual"
            />
            <input
              type="password"
              value={pwd.new}
              onChange={e => { setPwd(p => ({ ...p, new: e.target.value })); setPwdStatus(null) }}
              className={inputClass()}
              placeholder="Nueva contraseña (mín. 8 car., mayúscula, número, símbolo)"
            />
            <input
              type="password"
              value={pwd.confirm}
              onChange={e => { setPwd(p => ({ ...p, confirm: e.target.value })); setPwdStatus(null) }}
              className={inputClass(!!pwd.confirm && pwd.confirm !== pwd.new)}
              placeholder="Confirmar nueva contraseña"
            />
            <button onClick={savePassword} disabled={pwdLoading || !pwd.current || !pwd.new} className={`${btnClass} w-full`}>
              {pwdLoading ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </div>
          <StatusMsg status={pwdStatus} />
        </Section>

        {/* Info de cuenta — solo lectura */}
        <Section title="Información de cuenta">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-500">Plan actual</span>
              <span className={profile.plan === 'pro' ? 'text-violet-400 font-medium' : 'text-zinc-300'}>
                {profile.plan === 'pro' ? '💎 Pro' : 'Free'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-zinc-500">Miembro desde</span>
              <span className="text-zinc-300">{memberSince}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-zinc-500">¿Quieres más funciones?</span>
              <a href="/dashboard/plan" className="text-violet-400 hover:text-violet-300 transition text-xs underline">
                Ver Plan Pro →
              </a>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
