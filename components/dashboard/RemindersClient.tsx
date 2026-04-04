'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Reminder {
  id: number
  reminder_text: string
  remind_at: string
  sent: boolean
}

export default function RemindersClient({ isPro }: { isPro: boolean }) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [noTelegram, setNoTelegram] = useState(false)
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/reminders').then(r => r.json())
    if (r.reminders === undefined) { setNoTelegram(true); setLoading(false); return }
    setReminders(r.reminders ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addReminder = async () => {
    if (!newText || !newDate) return
    setAdding(true)
    await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderText: newText, remindAt: newDate })
    })
    setNewText('')
    setNewDate('')
    setAdding(false)
    load()
  }

  const deleteReminder = async (id: number) => {
    await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">🔔 Recordatorios</h1>
        <p className="text-zinc-500 text-sm">Gestiona tus recordatorios programados con Kael</p>
      </div>

      {noTelegram ? (
        <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-8 text-center">
          <p className="text-zinc-400 mb-4">Configura tu Telegram Chat ID para gestionar recordatorios.</p>
          <Link href="/dashboard/settings" className="text-sm text-indigo-400 hover:text-indigo-300">
            Ir a Configuración →
          </Link>
        </div>
      ) : (
        <>
          {isPro ? (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#111] p-5 mb-5">
              <p className="text-sm font-medium text-zinc-300 mb-3">Nuevo recordatorio</p>
              <div className="flex gap-3 flex-wrap">
                <input
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="¿Qué quieres recordar?"
                  className="flex-1 min-w-0 bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
                />
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={addReminder}
                  disabled={adding || !newText || !newDate}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {adding ? '…' : 'Agregar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-5">
              <span className="text-violet-300 text-sm">💎 Crea recordatorios desde la web con el Plan Pro.</span>
              <Link href="/dashboard/plan" className="text-xs text-violet-300 underline ml-auto whitespace-nowrap">Mejorar →</Link>
            </div>
          )}

          {loading ? (
            <p className="text-zinc-600 text-sm">Cargando…</p>
          ) : reminders.length === 0 ? (
            <p className="text-zinc-600 text-sm">
              {isPro ? 'No hay recordatorios. ¡Crea uno arriba!' : 'No hay recordatorios activos.'}
            </p>
          ) : (
            <div className="space-y-2">
              {reminders.map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-[#1e1e1e] bg-[#111] p-4">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${r.sent ? 'bg-zinc-700' : 'bg-indigo-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${r.sent ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
                      {r.reminder_text}
                    </p>
                    <p className="text-[0.7rem] text-zinc-600 mt-0.5">
                      {new Date(r.remind_at).toLocaleString('es', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!r.sent && isPro && (
                    <button
                      onClick={() => deleteReminder(r.id)}
                      className="text-zinc-700 hover:text-red-500 text-sm transition-colors px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
