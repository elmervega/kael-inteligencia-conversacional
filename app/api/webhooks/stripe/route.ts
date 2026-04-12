import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

// IMPORTANTE: Next.js no debe parsear el body para webhooks de Stripe
export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    console.error('[Stripe Webhook] Missing env vars')
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.warn('[Stripe Webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    // Pago completado → activar plan Pro
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const email = session.customer_email
      if (email) {
        await prisma.user.updateMany({ where: { email }, data: { plan: 'pro' } })
        console.log(`[Stripe] Plan Pro activado para: ${email}`)
      }
    }

    // Suscripción cancelada → bajar a Free
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
      if (customer.email) {
        await prisma.user.updateMany({ where: { email: customer.email }, data: { plan: 'free' } })
        console.log(`[Stripe] Plan bajado a Free para: ${customer.email}`)
      }
    }

    // Renovación fallida → notificar (no bajar plan aún)
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      console.warn(`[Stripe] Pago fallido para customer: ${invoice.customer}`)
    }
  } catch (err) {
    console.error('[Stripe Webhook] DB error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
