'use client'

import { useState, useEffect } from 'react'

interface Prefs {
  kaelName: string
  language: string
  tone: string
  customInstruction: string
  telegramChatId: string // preserved in state but not shown in form
}

function ProBadge() {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 mt-1">
      <span className="text-violet-400 text-xs">💎 Función exclusiva del Plan Pro</span>
      <a href="/dashboard/plan" className="text-xs text-violet-300 underline ml-auto whitespace-nowrap">Mejorar →</a>
    </div>
  )
}

function EcosistemaKael() {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#0d0b2a] to-[#0a0a12] p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold text-white">🌐 Ecosistema Kael</h2>
        <span className="text-[0.6rem] bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full font-semibold tracking-wider">
          CONECTA
        </span>
      </div>
      <p className="text-xs text-zinc-500 mb-5">Accede a todas las herramientas del ecosistema Kael</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Card 1: App Nativa APK */}
        <div className="bg-[#0a0f26] border border-indigo-500/10 hover:border-indigo-500/30 rounded-xl p-5 transition-all duration-200 hover:shadow-[0_0_24px_rgba(99,102,241,0.08)]">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-indigo-400">
              <rect x="5" y="2" width="14" height="20" rx="2"/>
              <path d="M12 18h.01"/>
              <path d="M9 2v1M15 2v1"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1.5">App Nativa (APK)</h3>
          <p className="text-xs text-zinc-500 leading-relaxed mb-5">
            Lleva la inteligencia de Kael en tu bolsillo. Descarga la versión oficial para Android.
          </p>
          <a
            href="/kael-app.apk"
            download
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-300 border border-indigo-500/30 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar APK
          </a>
        </div>

        {/* Card 2: Soporte Técnico */}
        <div className="bg-[#0a0f26] border border-[#0088cc]/10 hover:border-[#0088cc]/30 rounded-xl p-5 transition-all duration-200 hover:shadow-[0_0_24px_rgba(0,136,204,0.08)]">
          <div className="w-10 h-10 rounded-lg bg-[#0088cc]/10 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0088cc]">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1.5">Soporte Técnico</h3>
          <p className="text-xs text-zinc-500 leading-relaxed mb-5">
            ¿Encontraste un bug o necesitas ayuda? Habla directamente con nosotros por Telegram.
          </p>
          <a
            href="https://t.me/KaelSoporte"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0088cc] rounded-lg hover:bg-[#0099dd] transition-all duration-200"
          >
            Abrir Telegram
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <path d="M7 17L17 7M17 7H7M17 7v10"/>
            </svg>
          </a>
        </div>

      </div>
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#13113a] to-[#111] p-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-semibold text-white">⚙️ Configurar a Kael</h2>
          <span className="text-[0.6rem] bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full font-semibold tracking-wider">
            PRINCIPAL
          </span>
        </div>
        <p className="text-xs text-zinc-500 mb-5">Personaliza cómo Kael te responde</p>

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

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-60"
          >
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <EcosistemaKael />
    </div>
  )
}
