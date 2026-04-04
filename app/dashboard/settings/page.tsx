// app/dashboard/settings/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import KaelConfigForm from '@/components/dashboard/KaelConfigForm'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const isPro = (session.user as any).plan === 'pro'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">⚙️ Configurar Kael</h1>
        <p className="text-zinc-500 text-sm">Personaliza cómo Kael te responde</p>
      </div>
      <KaelConfigForm isPro={isPro} />
    </div>
  )
}
