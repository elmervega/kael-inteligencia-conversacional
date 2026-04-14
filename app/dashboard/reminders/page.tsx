import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RemindersClient from '@/components/dashboard/RemindersClient'

export const metadata: Metadata = { title: 'Recordatorios', robots: { index: false } }

export default async function RemindersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const isPro = (session.user as any).plan === 'pro'
  return <RemindersClient isPro={isPro} />
}
