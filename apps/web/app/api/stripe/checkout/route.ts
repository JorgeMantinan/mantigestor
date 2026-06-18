import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe/helpers'
import { PRO_PRICE_ID } from '@/lib/stripe/server'

export async function POST() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  if (!PRO_PRICE_ID) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 })
  }

  const session = await createCheckoutSession(user.id, user.email!, PRO_PRICE_ID)
  return NextResponse.json({ url: session.url })
}
