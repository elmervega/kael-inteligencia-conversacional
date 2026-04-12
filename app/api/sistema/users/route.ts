import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [total, verified, recent] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emailVerified: true,
          createdAt: true,
          plan: true,
        },
      }),
    ])

    const pendingVerification = total - verified

    return NextResponse.json({
      total,
      verified,
      pendingVerification,
      recent,
    })
  } catch {
    return NextResponse.json(
      { total: 0, verified: 0, pendingVerification: 0, recent: [] },
      { status: 500 }
    )
  }
}
