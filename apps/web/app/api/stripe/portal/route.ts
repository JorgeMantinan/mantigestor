import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado', disponible: false }, { status: 503 })
  }

  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: suscripcion, error: subError } = await supabase
    .from('suscripciones')
    .select('providerSubscriptionId')
    .eq('perfilId', user.id)
    .single()

  if (subError || !suscripcion) {
    return NextResponse.json({ error: 'No hay suscripción activa' }, { status: 404 })
  }

  const { stripe } = await import('@/lib/stripe/server')
  const { createPortalSession } = await import('@/lib/stripe/helpers')

  const subscription = await stripe.subscriptions.retrieve(suscripcion.providerSubscriptionId)
  const customerId = subscription.customer as string

  const session = await createPortalSession(customerId)
  return NextResponse.json({ url: session.url })
}
