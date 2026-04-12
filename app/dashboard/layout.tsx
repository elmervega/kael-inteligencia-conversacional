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
    <div className="flex h-screen bg-[#080808]">
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          plan: (session.user as any).plan
        }}
      />
      <main className="flex-1 overflow-y-auto min-w-0 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
