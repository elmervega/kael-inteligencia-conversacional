import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { auth } from '@/lib/auth'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRICE_ID
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://kael.quest'

  if (!stripeKey || !priceId) {
    console.error('[Stripe] Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID')
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey)

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: (session.user as any).id ?? '' },
      success_url: `${baseUrl}/dashboard/plan?stripe=success`,
      cancel_url: `${baseUrl}/dashboard/plan?stripe=canceled`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[Stripe] Checkout session error:', err)
    return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 })
  }
}
