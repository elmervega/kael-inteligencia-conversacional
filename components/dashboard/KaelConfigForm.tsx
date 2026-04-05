'use client'

import { useState, useEffect } from 'react'

interface Prefs {
  kaelName: string
  language: string
  tone: string
  customInstruction: string
  telegramChatId: string
}

function ProBadge() {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 mt-1">
      <span className="text-violet-400 text-xs">💎 Función exclusiva del Plan Pro</span>
      <a href="/dashboard/plan" className="text-xs text-violet-300 underline ml-auto whitespace-nowrap">Mejorar →</a>
    </div>
  )
}

export default function KaelConfigForm({ isPro = false }: { isPro?: boolean }) {
  const [prefs, setPrefs] = useState<Prefs>({
    kaelName: '', language: 'es', tone: 'motivacional',
    customInstruction: '', telegramChatId: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/preferences')
      .then(r => r.json())
      .then(data => setPrefs({
        kaelName: data.kaelName ?? '',
        language: data.language ?? 'es',
        tone: data.tone ?? 'motivacional',
        customInstruction: data.customInstruction ?? '',
        telegramChatId: data.telegramChatId ?? ''
      }))
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const tones = ['motivacional', 'casual', 'formal']

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#13113a] to-[#111] p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold text-white">⚙️ Configurar a Kael</h2>
        <span className="text-[0.6rem] bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full font-semibold tracking-wider">
          PRINCIPAL
        </span>
      </div>
      <p className="text-xs text-zinc-500 mb-5">Personaliza cómo Kael te responde en Telegram</p>

      <div className="space-y-4">
        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            ¿Cómo te llama Kael?
          </label>
          <input
            value={prefs.kaelName}
            onChange={e => setPrefs(p => ({ ...p, kaelName: e.target.value }))}
            placeholder="Tu nombre"
            className="w-full bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            Idioma
          </label>
          <select
            value={prefs.language}
            onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
            className="w-full bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇺🇸 Inglés</option>
            <option value="auto">Detectar automáticamente</option>
          </select>
        </div>

        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            Tono de personalidad
          </label>
          <div className="flex gap-2">
            {tones.map(t => (
              <button
                key={t}
                onClick={() => setPrefs(p => ({ ...p, tone: t }))}
                className={`flex-1 py-2 rounded-lg text-xs capitalize transition-colors ${
                  prefs.tone === t
                    ? 'bg-indigo-900/50 border border-indigo-500/60 text-indigo-200 font-semibold'
                    : 'bg-[#0e0e0e] border border-[#282828] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            Instrucción especial <span className="text-zinc-700 normal-case">(opcional)</span>
          </label>
          {isPro ? (
            <input
              value={prefs.customInstruction}
              onChange={e => setPrefs(p => ({ ...p, customInstruction: e.target.value }))}
              placeholder="Ej: Siempre termina con una cita inspiradora"
              className="w-full bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
            />
          ) : (
            <ProBadge />
          )}
        </div>

        <div>
          <label className="block text-[0.7rem] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
            Conectar Telegram
          </label>
          {!prefs.telegramChatId ? (
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 mb-2 space-y-2">
              <p className="text-xs text-zinc-400 font-medium">Para vincular tu cuenta sigue estos pasos:</p>
              <ol className="space-y-1.5">
                {[
                  <>Abre Telegram y busca <span className="text-indigo-400 font-semibold">@userinfobot</span></>,
                  <>Envía cualquier mensaje y copia el número que aparece en <span className="text-zinc-300">Id:</span></>,
                  'Pégalo aquí abajo y guarda'
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                    <span className="w-4 h-4 rounded-full bg-indigo-900/60 text-indigo-300 flex items-center justify-center shrink-0 text-[0.6rem] font-bold mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-xs text-emerald-500 mb-1.5">✓ Telegram vinculado — ID: {prefs.telegramChatId}</p>
          )}
          <input
            value={prefs.telegramChatId}
            onChange={e => setPrefs(p => ({ ...p, telegramChatId: e.target.value.replace(/\D/g, '') }))}
            placeholder="Ej: 826656822"
            inputMode="numeric"
            className="w-full bg-[#0e0e0e] border border-[#282828] rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-60"
        >
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
