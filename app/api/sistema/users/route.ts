import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [total, verified, recent] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
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

    return NextResponse.json({
      total,
      verified,
      pendingVerification: total - verified,
      recent,
    })
  } catch {
    return NextResponse.json(
      { total: 0, verified: 0, pendingVerification: 0, recent: [] },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  let body: { userId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const { userId } = body
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Eliminar tokens y luego el usuario
  await prisma.emailVerificationToken.deleteMany({ where: { email: user.email ?? '' } })
  await prisma.passwordResetToken.deleteMany({ where: { email: user.email ?? '' } })
  await prisma.user.delete({ where: { id: userId } })

  console.log(`[sistema] Usuario eliminado: ${user.email} (${userId})`)

  return NextResponse.json({ ok: true, deleted: { email: user.email, name: user.name } })
}
