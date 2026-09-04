import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function POST(req: Request) {
  try {
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

    const body = await req.json()
    const { facturaId, email, amount, descripcion } = body as {
      facturaId: string
      email: string
      amount: number
      descripcion: string
    }

    if (!facturaId || !email || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const { stripe } = await import('@/lib/stripe/server')

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: descripcion || `Cobro recurrente - ${facturaId}`,
            },
            unit_amount: Math.round(amount * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      payment_method_types: ['card', 'paypal', 'sepa_debit'],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gestoria/facturas?cobro=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gestoria/facturas/recurrentes?cobro=cancelled`,
      metadata: { userId: user.id, facturaId },
      subscription_data: {
        metadata: { userId: user.id, facturaId },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
