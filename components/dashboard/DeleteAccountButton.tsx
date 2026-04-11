'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function DeleteAccountButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/profile', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: confirm })
    })
    if (res.ok) {
      await signOut({ redirect: false })
      router.push('/?deleted=1')
    } else {
      const d = await res.json()
      setError(d.error ?? 'Error al eliminar la cuenta.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-red-900/30 bg-red-950/10 hover:bg-red-950/20 hover:border-red-800/40 transition-all group text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">🗑️</span>
          <div>
            <p className="text-sm font-medium text-red-400">Eliminar cuenta</p>
            <p className="text-xs text-zinc-600">Esta acción es irreversible</p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="w-4 h-4 text-zinc-700 group-hover:text-red-500 transition-colors">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#111] border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Eliminar cuenta</h3>
                <p className="text-zinc-500 text-xs">Todos tus datos serán borrados permanentemente.</p>
              </div>
            </div>

            <p className="text-zinc-400 text-xs">
              Escribe tu email <span className="text-zinc-200">{email}</span> para confirmar:
            </p>

            <input
              type="text"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(null) }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
              placeholder={email}
              autoFocus
            />

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setOpen(false); setConfirm(''); setError(null) }}
                disabled={loading}
                className="flex-1 py-2.5 rounded-full border border-zinc-800 text-zinc-400 text-sm hover:bg-zinc-800 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirm.toLowerCase() !== email.toLowerCase()}
                className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition disabled:opacity-40"
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
