import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as import('stripe').Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const subscriptionId = session.subscription as string

      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        await getSupabaseAdmin().from('suscripciones').insert({
          perfilId: userId,
          tier: 'PRO',
          provider: 'stripe',
          providerSubscriptionId: subscriptionId,
          estado: 'active',
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        })
      }
      break
    }
    case 'invoice.paid': {
      const invoice = event.data.object as import('stripe').Stripe.Invoice
      const subscriptionId = invoice.subscription as string

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        await getSupabaseAdmin()
          .from('suscripciones')
          .update({
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            estado: 'active',
          })
          .eq('providerSubscriptionId', subscriptionId)
      }
      break
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription

      await getSupabaseAdmin()
        .from('suscripciones')
        .update({
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          estado: subscription.status === 'active' ? 'active' : 'canceled',
        })
        .eq('providerSubscriptionId', subscription.id)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as import('stripe').Stripe.Subscription

      await getSupabaseAdmin()
        .from('suscripciones')
        .update({ estado: 'canceled' })
        .eq('providerSubscriptionId', subscription.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
