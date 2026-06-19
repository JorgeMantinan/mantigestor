import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@/lib/supabase/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export async function POST(req: Request) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ disponible: false, tier: 'BASIC' }, { status: 503 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        error: 'Falta SUPABASE_SERVICE_ROLE_KEY en .env.local',
        solucion: 'Cópiala de: Supabase Dashboard → Project Settings → API → service_role key',
      }, { status: 500 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const adminPing = await admin.from('suscripciones').select('id').limit(1).maybeSingle()
    if (adminPing.error?.message === 'Invalid API key') {
      return NextResponse.json({
        error: 'SUPABASE_SERVICE_ROLE_KEY inválida',
        solucion: 'Regenera la key en: Supabase Dashboard → Project Settings → API → service_role key, luego actualiza .env.local',
      }, { status: 500 })
    }

    const { data: existing } = await admin
      .from('suscripciones')
      .select('id, tier, estado')
      .eq('perfilId', user.id)
      .order('currentPeriodStart', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.estado === 'active' && existing?.tier === 'PRO') {
      return NextResponse.json({ tier: 'PRO', estado: 'active' })
    }

    let sessionId: string | undefined
    try {
      const body = await req.json()
      sessionId = body?.sessionId
    } catch {}

    let subId: string | null = null

    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        subId = (session.subscription as string) ?? null
      } catch (e) {
        console.error('Error retrieving Stripe session:', e)
      }
    }

    if (!subId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 10 })
      for (const customer of customers.data) {
        const customerSubs = await stripe.subscriptions.list({
          customer: customer.id, limit: 10, status: 'all',
        })
        for (const sub of customerSubs.data) {
          if (['active', 'trialing', 'past_due'].includes(sub.status)) {
            subId = sub.id
            break
          }
        }
        if (subId) break
      }
    }

    if (subId) {
      const subscription = await stripe.subscriptions.retrieve(subId)
      const record = {
        id: crypto.randomUUID(),
        perfilId: user.id,
        tier: 'PRO',
        provider: 'stripe',
        providerSubscriptionId: subId,
        estado: subscription.status === 'active' ? 'active' : 'trialing',
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      }

      let { error: dbError } = await admin.from('suscripciones').insert(record)

      if (dbError?.code === '23505') {
        const { data: dupes } = await admin
          .from('suscripciones')
          .select('id')
          .eq('perfilId', user.id)
          .order('id', { ascending: false })
          .limit(1)
        if (dupes?.[0]) {
          const { error: upErr } = await admin
            .from('suscripciones')
            .update(record)
            .eq('id', dupes[0].id)
          dbError = upErr
        } else {
          await admin.from('suscripciones').update(record).eq('perfilId', user.id)
        }
      }

      if (dbError) {
        console.error('Error writing subscription:', dbError)
        return NextResponse.json({ error: 'Error al guardar la suscripción' }, { status: 500 })
      }

      return NextResponse.json({ tier: 'PRO', estado: 'active' })
    }

    return NextResponse.json({ tier: 'BASIC', estado: 'inactive' })
  } catch (err) {
    console.error('Error verifying subscription:', err)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
