import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo, esSoloLectura } from '@/lib/resolve-perfil-activo'

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 5, windowMs: 60 * 1000 })
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
    const { facturaId, descripcion } = body as {
      facturaId: string
      descripcion?: string
    }

    if (!facturaId || typeof facturaId !== 'string') {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    // El importe NUNCA llega del cliente: se deriva en servidor desde la
    // plantilla de la factura recurrente, comprobando que pertenece al
    // perfil activo (si no, se ignora el importe y se cobra la cifra real).
    const { perfilId, rol } = await resolvePerfilActivo(req)
    // Escritura bloqueada para perfiles en modo solo lectura (visualizador)
    if (esSoloLectura(rol)) {
      return NextResponse.json({ error: 'El perfil está en modo solo lectura' }, { status: 403 })
    }
    const { data: plantilla } = await supabase
      .from('facturas_recurrentes')
      .select('id, baseImponible, iva, numero, emisorReceptor')
      .eq('id', facturaId)
      .eq('perfilId', perfilId)
      .maybeSingle()

    if (!plantilla) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    const importeIva = Math.round(plantilla.baseImponible * (plantilla.iva / 100))
    const totalCentimos = plantilla.baseImponible + importeIva
    if (totalCentimos <= 0) {
      return NextResponse.json({ error: 'Importe inválido' }, { status: 400 })
    }

    const { stripe } = await import('@/lib/stripe/server')

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email ?? undefined,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: (descripcion || `Cobro recurrente - ${plantilla.numero}`).slice(0, 200),
            },
            unit_amount: totalCentimos,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      payment_method_types: ['card', 'paypal', 'sepa_debit'],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gestoria/facturas?cobro=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gestoria/facturas/recurrentes?cobro=cancelled`,
      metadata: { userId: user.id, facturaId, tipo: 'cobro_factura' },
      subscription_data: {
        metadata: { userId: user.id, facturaId, tipo: 'cobro_factura' },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
