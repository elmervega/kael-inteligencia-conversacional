import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Resend } from 'resend'

const schema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])(.{8,})$/)
    .optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, plan: true, createdAt: true, telegramChatId: true }
  })

  return NextResponse.json(user)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, currentPassword, newPassword } = parsed.data
  const updateData: Record<string, unknown> = {}

  if (name) updateData.name = name.trim()

  if (email && email !== session.user.email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'EMAIL_TAKEN', message: 'Ese email ya está en uso.' }, { status: 409 })
    updateData.email = email.toLowerCase()
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Debes ingresar tu contraseña actual.' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } })
    const valid = user?.password && await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 400 })
    }
    updateData.password = await bcrypt.hash(newPassword, 12)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ ok: true })
  }

  await prisma.user.update({ where: { id: session.user.id }, data: updateData })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { email } = body as { email?: string }
  if (!email || email.toLowerCase() !== session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'El email no coincide.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

  await prisma.user.delete({ where: { id: session.user.id } })

  // Notify via email (fire and forget)
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Kael <noreply@kael.quest>',
      to: user.email!,
      subject: 'Tu cuenta en Kael ha sido eliminada',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #050505; color: #fff; padding: 40px 20px; max-width: 480px; margin: 0 auto; border-radius: 16px;">
          <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Cuenta eliminada</h1>
          <p style="color: #a1a1aa; margin-bottom: 16px;">Hola${user.name ? ` ${user.name}` : ''}, tu cuenta y todos tus datos han sido eliminados permanentemente de Kael.</p>
          <p style="color: #52525b; font-size: 13px;">Si no realizaste esta acción, contáctanos respondiendo este correo.</p>
        </div>
      `
    })
  } catch { /* no bloquear si falla el email */ }

  return NextResponse.json({ ok: true })
}
