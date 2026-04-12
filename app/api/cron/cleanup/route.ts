import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Requiere CRON_SECRET en header Authorization: Bearer <secret>
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: Record<string, number> = {}

  try {
    // 1. PasswordResetToken expirados
    const { count: prt } = await prisma.passwordResetToken.deleteMany({
      where: { expires: { lt: now } }
    })
    results.passwordResetTokens = prt

    // 2. EmailVerificationToken expirados
    const { count: evt } = await prisma.emailVerificationToken.deleteMany({
      where: { expires: { lt: now } }
    })
    results.emailVerificationTokens = evt

    // 3. Sessions de NextAuth expiradas
    const { count: sess } = await prisma.session.deleteMany({
      where: { expires: { lt: now } }
    })
    results.sessions = sess

    // 4. ApiUsage de más de 90 días (mantiene la tabla liviana)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const { count: usage } = await prisma.apiUsage.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } }
    })
    results.apiUsageOldRecords = usage

    console.log(`[Cron Cleanup] ${now.toISOString()} — borrados:`, results)

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      deleted: results
    })
  } catch (err) {
    console.error('[Cron Cleanup] Error:', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
