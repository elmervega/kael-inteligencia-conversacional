import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RemindersClient from '@/components/dashboard/RemindersClient'

export default async function RemindersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const isPro = (session.user as any).plan === 'pro'
  return <RemindersClient isPro={isPro} />
}
