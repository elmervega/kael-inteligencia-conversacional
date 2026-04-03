'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <nav className="border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Kael
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{session?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-sm text-zinc-400 hover:text-white transition"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2">
            Hola, {session?.user?.name} 👋
          </h1>
          <p className="text-zinc-500 mb-12">Bienvenido a tu dashboard de Kael.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-900/20">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Plan actual</p>
              <p className="text-2xl font-bold capitalize">{(session?.user as any)?.plan || 'free'}</p>
              <button className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition">
                Mejorar plan
              </button>
            </div>

            <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-900/20">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Kael en Telegram</p>
              <p className="text-sm text-zinc-400 mb-4">Conecta con Kael directamente desde Telegram.</p>
              <button
                onClick={() => window.open('https://t.me/KaelConsciente_bot', '_blank')}
                className="inline-block text-sm bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-100 transition font-medium"
              >
                Abrir en Telegram
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}