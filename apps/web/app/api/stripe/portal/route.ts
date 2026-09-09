import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 5, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe no configurado', disponible: false }, { status: 503 })
    }

    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { perfilId } = await resolvePerfilActivo(req)

    const { data: suscripcion, error: subError } = await supabase
      .from('suscripciones')
      .select('providerSubscriptionId')
      .eq('perfilId', perfilId)
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
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
