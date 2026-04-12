'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

const PRO_FEATURES = [
  { icon: '💬', label: 'Mensajes ilimitados', sub: 'vs 20 mensajes por día en Free' },
  { icon: '🔔', label: 'Recordatorios ilimitados', sub: 'Sin límite de recordatorios activos' },
  { icon: '🧠', label: 'Memoria persistente', sub: 'Kael recuerda todo a largo plazo' },
  { icon: '🎙️', label: 'Audios y voz', sub: 'Envía mensajes de voz a Kael' },
  { icon: '⚡', label: 'Prioridad en respuestas', sub: 'Menor latencia, mayor velocidad' },
]

const EMPRESARIAL_FEATURES = [
  { icon: '✅', label: 'Todo lo del Plan Pro', sub: 'Incluye todas las funciones anteriores' },
  { icon: '👥', label: 'Múltiples usuarios', sub: 'Gestiona varios usuarios en tu cuenta' },
  { icon: '🛡️', label: 'Soporte prioritario', sub: 'Respuesta en menos de 2 horas' },
  { icon: '🎨', label: 'Personalización avanzada', sub: 'Adapta Kael completamente a tu negocio' },
]

const STEPS = [
  'Abre la app de Yappy en tu teléfono.',
  'Escanea el código QR o envía al número 6335-9701.',
  'Envía B/. 2.99 con tu correo de Kael como nota.',
  'Toma captura de pantalla del pago confirmado.',
  'Envíanos la captura al soporte para activar Pro.',
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="ml-2 text-[0.65rem] px-2 py-0.5 rounded bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60 transition"
    >
      {copied ? '✓ Copiado' : 'Copiar'}
    </button>
  )
}

export default function PlanPage() {
  const { data: session } = useSession()
  const plan = (session?.user as any)?.plan ?? 'free'
  const isPro = plan === 'pro'

  return (
    <div className="p-6 max-w-2xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">💎 Mi Plan</h1>
        <p className="text-zinc-500 text-sm">Gestiona tu suscripción de Kael</p>
      </div>

      {/* Plan actual */}
      <div className={`rounded-2xl border p-5 ${
        isPro
          ? 'border-violet-500/30 bg-violet-500/5'
          : 'border-zinc-800 bg-zinc-900/40'
      }`}>
        <p className="text-[0.68rem] uppercase tracking-widest text-zinc-500 mb-1">Plan actual</p>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold text-white capitalize">{plan}</p>
          {isPro && (
            <span className="text-xs bg-violet-500/20 border border-violet-500/30 text-violet-300 px-2.5 py-0.5 rounded-full font-semibold">
              ✓ Activo
            </span>
          )}
        </div>
        {isPro ? (
          <p className="text-sm text-emerald-400 mt-2">Tienes acceso completo a todas las funciones de Kael.</p>
        ) : (
          <p className="text-sm text-zinc-500 mt-2">
            Estás en el plan gratuito · <span className="text-white font-medium">20 mensajes/día</span>
          </p>
        )}
      </div>

      {/* Comparación de features */}
      {!isPro && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <p className="text-sm font-semibold text-white mb-4">Qué incluye el Plan Pro</p>
          <div className="space-y-3">
            {PRO_FEATURES.map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="text-base mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{f.label}</p>
                  <p className="text-[0.68rem] text-zinc-600">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloque de pago con Yappy */}
      {!isPro && (
        <div className="rounded-2xl border border-[#00a0e3]/20 bg-[#00a0e3]/5 p-5">
          {/* Título + precio */}
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <p className="text-sm font-bold text-white">Pagar con Yappy</p>
              <p className="text-[0.68rem] text-zinc-500 mt-0.5">Pago manual · se activa en menos de 24h</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">B/. 2.99</p>
              <p className="text-[0.65rem] text-zinc-500">al mes</p>
            </div>
          </div>

          {/* QR + instrucciones lado a lado */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">

            {/* QR Code */}
            <div className="shrink-0 bg-white rounded-xl p-3 shadow-lg">
              <Image
                src="/yappy-qr.png"
                alt="Código QR de Yappy para pagar a Elmer Vega"
                width={160}
                height={160}
                className="rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <p className="text-[0.6rem] text-center text-zinc-400 mt-1.5">Escanear con Yappy</p>
            </div>

            {/* Info de pago */}
            <div className="flex-1 space-y-3">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider mb-1">Número Yappy</p>
                <div className="flex items-center">
                  <span className="text-sm font-mono font-bold text-white">6335-9701</span>
                  <CopyButton text="63359701" />
                </div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider mb-1">Titular</p>
                <span className="text-sm font-medium text-zinc-200">Elmer Vega</span>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider mb-1">Monto</p>
                <span className="text-sm font-bold text-white">B/. 2.99</span>
                <span className="text-[0.65rem] text-zinc-600 ml-2">mensual</span>
              </div>
            </div>
          </div>

          {/* Pasos */}
          <div className="mt-5 border-t border-zinc-800/60 pt-4">
            <p className="text-[0.68rem] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Cómo activar tu plan Pro</p>
            <ol className="space-y-2">
              {STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-400">
                  <span className="w-5 h-5 rounded-full bg-[#00a0e3]/20 border border-[#00a0e3]/30 text-[#00a0e3] flex items-center justify-center shrink-0 text-[0.65rem] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* CTA soporte */}
          <div className="mt-4 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium text-zinc-300">¿Ya pagaste? Activa tu Pro ahora</p>
              <p className="text-[0.65rem] text-zinc-600">Envíanos la captura del pago con tu email</p>
            </div>
            <a
              href="https://t.me/KaelSoporte"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0088cc] rounded-lg hover:bg-[#0099dd] transition shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Contactar soporte
            </a>
          </div>
        </div>
      )}

      {/* Plan Empresarial — visible para todos */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-widest text-amber-500/70 mb-0.5">Empresarial</p>
            <p className="text-sm font-bold text-white">Para equipos y negocios</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">B/. 9.99</p>
            <p className="text-[0.65rem] text-zinc-500">al mes</p>
          </div>
        </div>
        <div className="space-y-2.5 mb-4">
          {EMPRESARIAL_FEATURES.map(f => (
            <div key={f.label} className="flex items-start gap-2.5">
              <span className="text-base mt-0.5 shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-medium text-zinc-200">{f.label}</p>
                <p className="text-[0.68rem] text-zinc-600">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <a
          href="https://t.me/KaelSoporte"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600/80 hover:bg-amber-600 rounded-lg transition"
        >
          Contactar para contratar
        </a>
      </div>

      {/* Usuario Pro — gestión */}
      {isPro && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
          <p className="text-sm font-semibold text-white mb-3">Tu suscripción Pro</p>
          <p className="text-xs text-zinc-500 mb-4">Para cancelar o cambiar tu plan, contacta con nuestro soporte.</p>
          <a
            href="https://t.me/KaelSoporte"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0088cc] rounded-lg hover:bg-[#0099dd] transition"
          >
            Contactar soporte
          </a>
        </div>
      )}

      {/* Link to chat */}
      <div className="pt-1">
        <Link
          href="/dashboard/chat"
          className="text-xs text-zinc-600 hover:text-zinc-400 transition"
        >
          ← Volver al chat
        </Link>
      </div>
    </div>
  )
}
