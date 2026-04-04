// app/dashboard/plan/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PlanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const plan = (session.user as any).plan ?? 'free'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">💎 Mi Plan</h1>
        <p className="text-zinc-500 text-sm">Gestiona tu suscripción</p>
      </div>

      <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-6 mb-5">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Plan actual</p>
        <p className="text-3xl font-bold text-white capitalize mb-4">{plan}</p>
        {plan === 'free' && (
          <>
            <p className="text-sm text-zinc-500 mb-5">Actualiza a Pro para desbloquear historial completo, configuración avanzada y más.</p>
            <button className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white opacity-60 cursor-not-allowed">
              Mejorar a Pro — Próximamente
            </button>
          </>
        )}
        {plan === 'pro' && (
          <p className="text-sm text-emerald-400">✓ Tienes acceso completo a todas las funciones.</p>
        )}
      </div>

      {plan === 'free' && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
          <p className="text-sm font-semibold text-violet-300 mb-3">Funciones Pro incluidas:</p>
          <ul className="space-y-2">
            {[
              'Historial completo de conversaciones',
              'Instrucción especial para Kael',
              'Crear y eliminar recordatorios desde la web',
              'Estadísticas avanzadas (próximamente)',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="text-violet-400">💎</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
