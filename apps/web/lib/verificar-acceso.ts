import { createServerClient } from '@/lib/supabase/server'
import { FEATURES_POR_TIER } from '@mantigestor/types'
import type { Feature, SubscriptionTier } from '@mantigestor/types'

function puedeUsarFeature(tier: SubscriptionTier, feature: Feature): boolean {
  return FEATURES_POR_TIER[tier].includes(feature)
}

function tierMinimoPara(feature: Feature): SubscriptionTier {
  if (FEATURES_POR_TIER.free.includes(feature)) return 'free'
  if (FEATURES_POR_TIER.basic.includes(feature)) return 'basic'
  return 'pro'
}
import { NextResponse } from 'next/server'

export async function verificarAccesoFeature(feature: Feature) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
      usuario: null
    }
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  if (!perfil || !puedeUsarFeature(perfil.subscription_tier as any, feature)) {
    return {
      error: NextResponse.json(
        { error: `Requiere plan ${tierMinimoPara(feature)}` },
        { status: 403 }
      ),
      usuario: null
    }
  }

  return { error: null, usuario: { ...user, tier: perfil.subscription_tier } }
}
