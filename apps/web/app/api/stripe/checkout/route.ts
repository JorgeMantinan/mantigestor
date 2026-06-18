import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function POST(req: Request) {
  const { success } = rateLimitByIp(req, { maxRequests: 5, windowMs: 60 * 1000 })
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
      { status: 429 }
    )
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado', disponible: false }, { status: 503 })
  }

  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { createCheckoutSession } = await import('@/lib/stripe/helpers')

  if (!process.env.STRIPE_PRO_PRICE_ID) {
    return NextResponse.json({ error: 'Stripe no configurado', disponible: false }, { status: 503 })
  }

  const session = await createCheckoutSession(user.id, user.email!, process.env.STRIPE_PRO_PRICE_ID)
  return NextResponse.json({ url: session.url })
}
