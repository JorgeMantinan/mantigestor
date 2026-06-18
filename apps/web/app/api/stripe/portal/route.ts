import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { createPortalSession } from '@/lib/stripe/helpers'

export async function POST() {
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

  const subscription = await stripe.subscriptions.retrieve(suscripcion.providerSubscriptionId)
  const customerId = subscription.customer as string

  const session = await createPortalSession(customerId)
  return NextResponse.json({ url: session.url })
}
