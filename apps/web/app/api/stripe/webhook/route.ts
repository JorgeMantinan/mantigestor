import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const { stripe } = await import('@/lib/stripe/server')
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
          const existing = await getSupabaseAdmin()
            .from('suscripciones')
            .select('id')
            .eq('providerSubscriptionId', subscriptionId)
            .maybeSingle()

          if (!existing.data) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)

            // Resolve auth userId → perfilId
            const { data: perfil } = await getSupabaseAdmin()
              .from('perfiles')
              .select('id')
              .eq('userId', userId)
              .single()

            const perfilId = perfil?.id
            if (!perfilId) {
              console.error('No perfil found for userId:', userId)
              break
            }

            const { error: insertError } = await getSupabaseAdmin().from('suscripciones').insert({
              id: crypto.randomUUID(),
              perfilId,
              tier: 'PRO',
              provider: 'stripe',
              providerSubscriptionId: subscriptionId,
              estado: 'active',
              currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              createdAt: new Date().toISOString(),
            })

            if (insertError) {
              console.error('Failed to insert subscription:', insertError)
            }
          }
        }
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const existing = await getSupabaseAdmin()
            .from('suscripciones')
            .select('id, estado')
            .eq('providerSubscriptionId', subscriptionId)
            .maybeSingle()

          if (!existing.data) {
            console.error('No subscription found for invoice.paid, subscriptionId:', subscriptionId)
            break
          }

          if (existing.data.estado === 'active') {
            break
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          const { error: updateError } = await getSupabaseAdmin()
            .from('suscripciones')
            .update({
              currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              estado: 'active',
            })
            .eq('providerSubscriptionId', subscriptionId)
            .eq('id', existing.data.id)

          if (updateError) {
            console.error('Failed to update subscription on invoice.paid:', updateError)
          }
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as import('stripe').Stripe.Subscription

        const { error: updateError } = await getSupabaseAdmin()
          .from('suscripciones')
          .update({
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            estado: subscription.status === 'active' ? 'active' : 'canceled',
          })
          .eq('providerSubscriptionId', subscription.id)

        if (updateError) {
          console.error('Failed to update subscription:', updateError)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as import('stripe').Stripe.Subscription

        const existing = await getSupabaseAdmin()
          .from('suscripciones')
          .select('id, estado')
          .eq('providerSubscriptionId', subscription.id)
          .maybeSingle()

        if (!existing.data) {
          console.error('No subscription found for subscription.deleted, id:', subscription.id)
          break
        }

        if (existing.data.estado === 'canceled') {
          break
        }

        const { error: updateError } = await getSupabaseAdmin()
          .from('suscripciones')
          .update({ estado: 'canceled' })
          .eq('providerSubscriptionId', subscription.id)
          .eq('id', existing.data.id)

        if (updateError) {
          console.error('Failed to cancel subscription:', updateError)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ received: true, error: 'Internal error' }, { status: 200 })
  }
}
