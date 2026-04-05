'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

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

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const deleteAccount = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    const res = await fetch('/api/profile', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: deleteEmail })
    })
    if (res.ok) {
      await signOut({ redirect: false })
      router.push('/?deleted=1')
    } else {
      const d = await res.json()
      setDeleteError(d.error ?? 'Error al eliminar la cuenta.')
      setDeleteLoading(false)
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

        {/* Zona de peligro */}
        <div className="border border-red-900/40 rounded-2xl p-6 bg-red-950/10">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-1">Zona de peligro</h2>
          <p className="text-zinc-500 text-xs mb-4">Una vez que elimines tu cuenta no hay vuelta atrás. Se borrarán todos tus datos permanentemente.</p>
          <button
            onClick={() => { setDeleteOpen(true); setDeleteEmail(''); setDeleteError(null) }}
            className="px-5 py-2.5 bg-red-950/60 text-red-400 border border-red-900/50 rounded-full text-sm font-medium hover:bg-red-900/40 hover:text-red-300 transition"
          >
            Eliminar mi cuenta
          </button>
        </div>
      </div>

      {/* Modal de confirmación */}
      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDeleteOpen(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-[#0e0e0e] border border-red-900/40 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-1">¿Eliminar cuenta?</h3>
              <p className="text-zinc-500 text-sm mb-5">
                Esta acción es permanente e irreversible. Para confirmar, escribe tu email: <span className="text-zinc-300 font-medium">{profile.email}</span>
              </p>
              <input
                type="email"
                value={deleteEmail}
                onChange={e => { setDeleteEmail(e.target.value); setDeleteError(null) }}
                placeholder={profile.email ?? 'tu@email.com'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-800 transition mb-3"
                autoFocus
              />
              {deleteError && (
                <p className="text-red-400 text-xs mb-3">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 border border-zinc-800 text-zinc-400 rounded-full text-sm hover:border-zinc-600 hover:text-zinc-300 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleteLoading || deleteEmail.toLowerCase() !== profile.email?.toLowerCase()}
                  className="flex-1 py-2.5 bg-red-950/80 text-red-400 border border-red-900/60 rounded-full text-sm font-medium hover:bg-red-900/50 transition disabled:opacity-40"
                >
                  {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
