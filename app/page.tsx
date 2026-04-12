'use client'

import { motion, useScroll, useTransform, type Variants } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/components/AnimatedBackground'
import Navbar from '@/components/Navbar'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } }
}

// Tema dinámico por hora del día
const getTimeTheme = () => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  if (h >= 18 && h < 22) return 'evening'
  return 'night'
}

const themes = {
  morning: {
    bg: '#0a0805',
    primary: 'bg-amber-500/10',
    secondary: 'bg-orange-500/10',
    glow: '#f59e0b',
    glowClass: 'bg-amber-500/[0.05]',
    pulse: '#fbbf24',
    diamond1: '#f59e0b',
    diamond2: '#fb923c',
    label: 'Buenos días',
  },
  afternoon: {
    bg: '#050a10',
    primary: 'bg-sky-500/10',
    secondary: 'bg-blue-500/10',
    glow: '#0ea5e9',
    glowClass: 'bg-sky-500/[0.05]',
    pulse: '#38bdf8',
    diamond1: '#0ea5e9',
    diamond2: '#6366f1',
    label: 'Buenas tardes',
  },
  evening: {
    bg: '#080510',
    primary: 'bg-violet-500/10',
    secondary: 'bg-purple-500/10',
    glow: '#8b5cf6',
    glowClass: 'bg-violet-500/[0.05]',
    pulse: '#a78bfa',
    diamond1: '#8b5cf6',
    diamond2: '#ec4899',
    label: 'Buenas tardes',
  },
  night: {
    bg: '#050505',
    primary: 'bg-blue-500/10',
    secondary: 'bg-violet-500/10',
    glow: '#3b82f6',
    glowClass: 'bg-blue-500/[0.04]',
    pulse: '#34d399',
    diamond1: '#6366f1',
    diamond2: '#3b82f6',
    label: 'Buenas noches',
  },
}

export default function Home() {
  const router = useRouter()
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const [theme, setTheme] = useState(themes.night)

  useEffect(() => {
    setTheme(themes[getTimeTheme()])
  }, [])

  return (
    <main className="min-h-screen text-white overflow-hidden transition-colors duration-1000" style={{ backgroundColor: theme.bg }}>
      <AnimatedBackground primary={theme.primary} secondary={theme.secondary} />
      <Navbar />

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">

        {/* Glow central dinámico */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-[700px] h-[700px] rounded-full blur-[130px] transition-colors duration-1000"
            style={{ backgroundColor: `${theme.glow}18` }}
          />
        </div>

        {/* Diamante / Logo Kael de fondo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[30%] pointer-events-none select-none"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
          >
          <svg
            width="700"
            height="700"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[420px] h-[420px] md:w-[620px] md:h-[620px] lg:w-[700px] lg:h-[700px]"
          >
            <defs>
              {/* Gradiente del contorno */}
              <linearGradient id="diamondStroke" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={theme.diamond1} stopOpacity="0.9" />
                <stop offset="50%" stopColor={theme.diamond2} stopOpacity="0.4" />
                <stop offset="100%" stopColor={theme.diamond2} stopOpacity="0.05" />
              </linearGradient>
              {/* Gradiente del relleno */}
              <linearGradient id="diamondFill" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={theme.diamond1} stopOpacity="0.07" />
                <stop offset="100%" stopColor={theme.diamond2} stopOpacity="0.01" />
              </linearGradient>
              {/* Glow filter */}
              <filter id="diamondGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Máscara para desvanecer hacia abajo */}
              <linearGradient id="fadeMask" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="70%" stopColor="white" stopOpacity="0.6" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <mask id="fadeBottom">
                <rect width="100" height="100" fill="url(#fadeMask)" />
              </mask>
            </defs>

            {/* Diamante principal */}
            <g mask="url(#fadeBottom)" filter="url(#diamondGlow)">
              <polygon
                points="50,2 98,50 50,98 2,50"
                fill="url(#diamondFill)"
                stroke="url(#diamondStroke)"
                strokeWidth="0.4"
              />
              {/* Diamante interior 1 */}
              <polygon
                points="50,14 86,50 50,86 14,50"
                fill="none"
                stroke="url(#diamondStroke)"
                strokeWidth="0.25"
                strokeOpacity="0.4"
              />
              {/* Diamante interior 2 */}
              <polygon
                points="50,26 74,50 50,74 26,50"
                fill="none"
                stroke="url(#diamondStroke)"
                strokeWidth="0.2"
                strokeOpacity="0.25"
              />
              {/* Líneas cruzadas */}
              <line x1="50" y1="2" x2="50" y2="98" stroke="url(#diamondStroke)" strokeWidth="0.15" strokeOpacity="0.2" />
              <line x1="2" y1="50" x2="98" y2="50" stroke="url(#diamondStroke)" strokeWidth="0.15" strokeOpacity="0.2" />
              {/* Punto central */}
              <circle cx="50" cy="50" r="1.2" fill="#6366f1" fillOpacity="0.5" />
            </g>
          </svg>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 mb-8">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: theme.pulse }}
            />
            <span className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-light">
              {theme.label} · Inteligencia conversacional
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-[clamp(4.5rem,12vw,10rem)] font-bold leading-[0.88] tracking-tight mb-10"
          >
            <span className="block text-white">No es una IA.</span>
            <span className="block bg-gradient-to-b from-zinc-300 to-zinc-600 bg-clip-text text-transparent">
              Es Kael.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-14 font-light"
          >
            Una presencia que te <span className="text-zinc-300">escucha</span>, recuerda y cuestiona.{' '}
            Diseñada para acompañarte, no solo responder.
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => router.push('/register')}
              className="group relative px-7 py-3 bg-white text-black text-sm font-medium rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10">Comenzar gratis</span>
              <div className="absolute inset-0 bg-zinc-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
            <button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-7 py-3 text-sm text-zinc-400 border border-zinc-800 rounded-full hover:border-zinc-600 hover:text-white transition-all duration-200"
            >
              Ver demo
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-zinc-600 to-transparent animate-pulse" />
        </motion.div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative px-6 py-32">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-20"
          >
            <p className="text-xs tracking-[0.2em] uppercase text-zinc-600 mb-4">Características</p>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-2xl">
              Hecho para personas reales
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800/30">
            {[
              {
                icon: '◈',
                title: 'Memoria persistente',
                desc: 'Recuerda quién eres y lo que has hablado. Nunca empiezas de cero.',
                accent: 'blue'
              },
              {
                icon: '◎',
                title: 'Entiende tu voz',
                desc: 'Envíale audios. Kael los transcribe y responde como si estuvieras hablando.',
                accent: 'violet'
              },
              {
                icon: '◷',
                title: 'Recordatorios',
                desc: 'Pídele que te recuerde algo y aparecerá exactamente cuando lo necesitas.',
                accent: 'emerald'
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group relative bg-[#050505] p-8 hover:bg-zinc-900/50 transition-colors duration-300"
              >
                <div className={`text-2xl mb-6 ${
                  item.accent === 'blue' ? 'text-blue-400' :
                  item.accent === 'violet' ? 'text-violet-400' : 'text-emerald-400'
                }`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed font-light">{item.desc}</p>
                <div className={`absolute bottom-0 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left ${
                  item.accent === 'blue' ? 'bg-blue-500/50' :
                  item.accent === 'violet' ? 'bg-violet-500/50' : 'bg-emerald-500/50'
                }`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="relative px-6 py-32 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="text-center mb-20"
          >
            <p className="text-xs tracking-[0.2em] uppercase text-zinc-600 mb-4">Proceso</p>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Tres pasos. Sin complicaciones.
            </h2>
          </motion.div>

          <div className="relative">
            {/* Línea conectora desktop */}
            <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              {[
                {
                  step: '01',
                  title: 'Crea tu cuenta',
                  desc: 'Regístrate gratis en menos de un minuto. Sin tarjeta, sin complicaciones.',
                  color: 'text-blue-400',
                  border: 'border-blue-500/20',
                  glow: 'bg-blue-500/5',
                },
                {
                  step: '02',
                  title: 'Abre el chat',
                  desc: 'Entra al dashboard y empieza a chatear con Kael directamente desde la web. Sin apps adicionales.',
                  color: 'text-violet-400',
                  border: 'border-violet-500/20',
                  glow: 'bg-violet-500/5',
                },
                {
                  step: '03',
                  title: 'Habla con Kael',
                  desc: 'Escribe, manda audios, pide recordatorios. Kael aprende y se adapta a ti.',
                  color: 'text-emerald-400',
                  border: 'border-emerald-500/20',
                  glow: 'bg-emerald-500/5',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="flex flex-col items-center text-center md:items-center"
                >
                  {/* Círculo con número */}
                  <div className={`relative w-20 h-20 rounded-full border ${item.border} ${item.glow} flex items-center justify-center mb-6`}>
                    <span className={`text-2xl font-bold ${item.color}`}>{item.step}</span>
                    <div className={`absolute inset-0 rounded-full ${item.glow} blur-xl`} />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed font-light max-w-[220px]">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA interno */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-16"
          >
            <button
              onClick={() => router.push('/register')}
              className="group relative px-8 py-3.5 bg-white text-black text-sm font-medium rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10">Empezar ahora — es gratis</span>
              <div className="absolute inset-0 bg-zinc-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="relative px-6 py-32 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="grid md:grid-cols-2 gap-16 items-center"
          >
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-zinc-600 mb-4">Demo</p>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                Kael en acción
              </h2>
              <p className="text-zinc-500 font-light leading-relaxed mb-8">
                No es un chatbot genérico. Es una conversación real con memoria, contexto y personalidad propia.
              </p>
              <button
                onClick={() => router.push('/register')}
                className="text-sm text-zinc-400 border border-zinc-800 px-6 py-3 rounded-full hover:border-zinc-600 hover:text-white transition-all"
              >
                Hablar con Kael
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/[0.03] rounded-2xl blur-xl" />
              <div className="relative border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800/80">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-xs text-zinc-600 ml-2">Kael · Chat Web</span>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { from: 'user', text: 'Recuérdame tomar agua a las 3pm' },
                    { from: 'kael', text: 'Listo. A las 3pm te recuerdo tomar agua.' },
                    { from: 'user', text: '¿Recuerdas cómo me llamo?' },
                    { from: 'kael', text: 'Sí, Elmer. Me lo dijiste hace dos conversaciones.' },
                  ].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: msg.from === 'user' ? 10 : -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 }}
                      className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] leading-relaxed ${
                        msg.from === 'user'
                          ? 'bg-white text-black font-medium rounded-tr-sm'
                          : 'bg-zinc-800 text-zinc-300 font-light rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="relative px-6 py-32 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <p className="text-xs tracking-[0.2em] uppercase text-zinc-600 mb-4">Tu panel de control</p>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Kael a tu manera
            </h2>
            <p className="text-zinc-500 font-light max-w-xl mx-auto">
              Desde el dashboard configuras su personalidad, revisas conversaciones y gestionas recordatorios. Todo en un solo lugar.
            </p>
          </motion.div>

          {/* Mock dashboard — visual rico */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative"
          >
            {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 rounded-3xl blur-2xl" />

            <div className="relative border border-zinc-800 rounded-2xl overflow-hidden bg-[#0d0d0d] shadow-2xl">
              {/* Browser bar */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800/80 bg-[#111]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                </div>
                <div className="flex-1 mx-4 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1 text-xs text-zinc-600">
                  kael.quest/dashboard
                </div>
              </div>

              {/* Dashboard layout */}
              <div className="flex" style={{ minHeight: '320px' }}>
                {/* Sidebar */}
                <div className="w-44 bg-[#111] border-r border-zinc-800 px-3 py-5 shrink-0 flex flex-col">
                  <p className="text-white font-bold text-sm mb-6 px-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Kael</p>
                  <p className="px-2 mb-1.5 text-[0.6rem] uppercase tracking-widest text-zinc-700">Principal</p>
                  {[
                    { icon: '⚡', label: 'Inicio', active: true },
                    { icon: '💬', label: 'Conversaciones', active: false },
                    { icon: '🔔', label: 'Recordatorios', active: false },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 text-xs transition-colors ${item.active ? 'bg-[#1c1c2e] text-white font-medium' : 'text-zinc-600'}`}>
                      <span className="text-sm">{item.icon}</span>{item.label}
                    </div>
                  ))}
                  <p className="px-2 mt-4 mb-1.5 text-[0.6rem] uppercase tracking-widest text-zinc-700">Cuenta</p>
                  {[
                    { icon: '⚙️', label: 'Configurar Kael' },
                    { icon: '👤', label: 'Mi Perfil' },
                    { icon: '💎', label: 'Mi Plan' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 text-xs text-zinc-600">
                      <span className="text-sm">{item.icon}</span>{item.label}
                    </div>
                  ))}
                  {/* User chip */}
                  <div className="mt-auto pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[#161616] border border-zinc-800">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">E</div>
                      <div>
                        <p className="text-xs font-medium text-zinc-200">Elmer</p>
                        <p className="text-[0.6rem] text-zinc-600">free</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-6 overflow-hidden">
                  {/* Header */}
                  <div className="mb-5">
                    <h3 className="text-white font-semibold text-base">Buenos días, Elmer 👋</h3>
                    <p className="text-zinc-600 text-xs">Tu asistente personal te está esperando</p>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Conversaciones', value: '24', icon: '💬', color: 'from-blue-500/10' },
                      { label: 'Recordatorios', value: '3', icon: '🔔', color: 'from-emerald-500/10' },
                      { label: 'Días con Kael', value: '12', icon: '⚡', color: 'from-violet-500/10' },
                    ].map((s, i) => (
                      <div key={i} className={`bg-gradient-to-br ${s.color} to-transparent border border-zinc-800 rounded-xl p-3`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[0.6rem] text-zinc-500 uppercase tracking-wider">{s.label}</p>
                          <span className="text-sm">{s.icon}</span>
                        </div>
                        <p className="text-xl font-bold text-white">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Config Kael */}
                  <div className="bg-gradient-to-br from-[#13113a] to-[#111] border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-zinc-300 font-medium">⚙️ Personalidad de Kael</p>
                      <span className="text-[0.6rem] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Personalizable</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                      {['Motivacional', 'Casual', 'Formal'].map((t, i) => (
                        <span key={i} className={`text-[0.65rem] px-3 py-1 rounded-lg cursor-default ${i === 0 ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 font-medium' : 'bg-[#0e0e0e] text-zinc-600 border border-zinc-800'}`}>{t}</span>
                      ))}
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-600">
                      Nombre preferido: <span className="text-zinc-400">Elmer</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-3 gap-6 mt-10"
          >
            {[
              { icon: '🧠', title: 'Memoria persistente', desc: 'Tu historial completo de conversaciones con Kael.' },
              { icon: '🎛️', title: 'Personalización total', desc: 'Nombre, tono, idioma e instrucciones especiales.' },
              { icon: '🔔', title: 'Gestión de recordatorios', desc: 'Crea, pausa y elimina recordatorios desde el panel.' },
            ].map((f, i) => (
              <div key={i} className="text-center p-4">
                <div className="text-2xl mb-3">{f.icon}</div>
                <p className="text-sm font-medium text-zinc-300 mb-1">{f.title}</p>
                <p className="text-xs text-zinc-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-8"
          >
            <button
              onClick={() => router.push('/register')}
              className="group relative px-8 py-3.5 bg-white text-black text-sm font-medium rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10">Empezar gratis — accede a tu dashboard</span>
              <div className="absolute inset-0 bg-zinc-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="relative px-6 py-32 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="mb-16"
          >
            <p className="text-xs tracking-[0.2em] uppercase text-zinc-600 mb-4">Testimonios</p>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight max-w-lg">
              Lo que dicen quienes lo usan
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                quote: 'Kael me recuerda cosas que yo mismo olvido. Ya no necesito alarmas para nada.',
                name: 'Carlos M.',
                role: 'Emprendedor',
                accent: 'border-blue-500/20',
              },
              {
                quote: 'Lo que más me sorprendió es que recuerda contexto de conversaciones anteriores. Siente que realmente te conoce.',
                name: 'Andrea R.',
                role: 'Diseñadora',
                accent: 'border-violet-500/20',
                featured: true,
              },
              {
                quote: 'Le mando audios cuando voy manejando y siempre entiende lo que necesito. Increíble.',
                name: 'Miguel T.',
                role: 'Ejecutivo',
                accent: 'border-emerald-500/20',
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`relative p-7 rounded-2xl border ${t.accent} bg-zinc-900/20 flex flex-col justify-between gap-8 ${t.featured ? 'md:-translate-y-3' : ''}`}
              >
                {t.featured && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
                )}
                <p className="text-zinc-300 font-light leading-relaxed text-base">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative px-6 py-32 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-20"
          >
            <p className="text-xs tracking-[0.2em] uppercase text-zinc-600 mb-4">Precios</p>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Simple y transparente
            </h2>
            <p className="text-zinc-500 font-light">Sin sorpresas. Empieza gratis.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: 'Gratis',
                price: '$0',
                period: 'para siempre',
                features: ['20 mensajes por día', '3 recordatorios activos', 'Memoria básica', 'Chat desde la web'],
                cta: 'Comenzar',
                highlight: false
              },
              {
                name: 'Pro',
                price: '$2.99',
                period: 'por mes',
                features: ['Mensajes ilimitados', 'Recordatorios ilimitados', 'Memoria persistente', 'Audios y voz'],
                cta: 'Comenzar ahora',
                highlight: true
              },
              {
                name: 'Empresarial',
                price: '$9.99',
                period: 'por mes',
                features: ['Todo lo de Pro', 'Múltiples usuarios', 'Soporte prioritario', 'Personalización'],
                cta: 'Contactar',
                highlight: false
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`relative p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlight
                    ? 'border-white/20 bg-white/[0.04]'
                    : 'border-zinc-800 bg-zinc-900/20'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                )}
                <div className="mb-6">
                  <p className="text-xs tracking-widest uppercase text-zinc-500 mb-3">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-zinc-500 text-sm">/{plan.period.split(' ')[1]}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-zinc-400 font-light">
                      <span className="w-1 h-1 rounded-full bg-zinc-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push(plan.name === 'Empresa' ? '#pricing' : '/register')}
                  className={`w-full py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-white text-black hover:bg-zinc-100'
                      : 'border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative px-6 py-32 border-t border-zinc-800/50 overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[300px] bg-blue-500/[0.06] rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-light">
                Disponible ahora
              </span>
            </div>

            <h2 className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[1] tracking-tight mb-6">
              <span className="block text-white">Tu asistente</span>
              <span className="block bg-gradient-to-b from-zinc-300 to-zinc-600 bg-clip-text text-transparent">
                te está esperando.
              </span>
            </h2>

            <p className="text-zinc-500 font-light leading-relaxed mb-10 max-w-md mx-auto">
              Empieza gratis hoy. Sin tarjeta de crédito.{' '}
              <span className="text-zinc-300">Solo tú y Kael.</span>
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => router.push('/register')}
                className="group relative px-8 py-3.5 bg-white text-black text-sm font-medium rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="relative z-10">Crear cuenta gratis</span>
                <div className="absolute inset-0 bg-zinc-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
              <button
                onClick={() => window.open('https://wa.me/50766484211', '_blank')}
                className="px-8 py-3.5 text-sm text-zinc-400 border border-zinc-800 rounded-full hover:border-zinc-600 hover:text-white transition-all duration-200 flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Hablar con Kael
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-10 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Kael
          </span>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <a href="mailto:aroonvegaf@gmail.com" className="hover:text-zinc-400 transition-colors">
              aroonvegaf@gmail.com
            </a>
            <span>·</span>
            <span>Panamá</span>
            <span>·</span>
            <span>Creado por Elmer Aron Vega · {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </main>
  )
}