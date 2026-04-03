'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/components/AnimatedBackground'

export default function NotFound() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6 overflow-hidden">
      <AnimatedBackground />

      {/* Diamante de fondo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        >
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[500px] h-[500px] opacity-30"
          >
            <defs>
              <linearGradient id="stroke404" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <polygon points="50,2 98,50 50,98 2,50" stroke="url(#stroke404)" strokeWidth="0.5" fill="none" />
            <polygon points="50,14 86,50 50,86 14,50" stroke="url(#stroke404)" strokeWidth="0.3" strokeOpacity="0.5" fill="none" />
            <polygon points="50,26 74,50 50,74 26,50" stroke="url(#stroke404)" strokeWidth="0.2" strokeOpacity="0.3" fill="none" />
            <circle cx="50" cy="50" r="1.5" fill="#6366f1" fillOpacity="0.6" />
          </svg>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-lg"
      >
        <div className="inline-flex items-center gap-2 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-light">
            Error 404
          </span>
        </div>

        <h1 className="text-[clamp(4rem,12vw,8rem)] font-bold leading-[0.9] tracking-tight mb-6">
          <span className="block text-white">Perdido</span>
          <span className="block bg-gradient-to-b from-zinc-300 to-zinc-600 bg-clip-text text-transparent">
            en el vacío.
          </span>
        </h1>

        <p className="text-zinc-500 font-light leading-relaxed mb-10 text-lg">
          Esta página no existe. Pero Kael sí.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => router.push('/')}
            className="group relative px-7 py-3 bg-white text-black text-sm font-medium rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10">Volver al inicio</span>
            <div className="absolute inset-0 bg-zinc-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
          <button
            onClick={() => window.open('https://t.me/KaelConsciente_bot', '_blank')}
            className="px-7 py-3 text-sm text-zinc-400 border border-zinc-800 rounded-full hover:border-zinc-600 hover:text-white transition-all duration-200"
          >
            Hablar con Kael
          </button>
        </div>
      </motion.div>
    </main>
  )
}
