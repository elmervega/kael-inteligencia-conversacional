import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    console.error('[dashboard/layout] auth() returned null — redirecting to /login')
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#080808]">
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          plan: (session.user as any).plan
        }}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
