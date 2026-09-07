import { createServerClient } from '@/lib/supabase/server'
import { FEATURES_POR_TIER } from '@mantigestor/types'
import type { Feature, SubscriptionTier } from '@mantigestor/types'
import { NextResponse } from 'next/server'

function puedeUsarFeature(tier: SubscriptionTier, feature: Feature): boolean {
  return FEATURES_POR_TIER[tier].includes(feature)
}

function tierMinimoPara(feature: Feature): SubscriptionTier {
  if (FEATURES_POR_TIER.free.includes(feature)) return 'free'
  if (FEATURES_POR_TIER.basic.includes(feature)) return 'basic'
  return 'pro'
}

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
    .select('id')
    .eq('userId', user.id)
    .single()
  if (!perfil) return { error: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 }), usuario: null }

  const { data: suscripcion } = await supabase
    .from('suscripciones')
    .select('tier')
    .eq('perfilId', perfil.id)
    .eq('estado', 'active')
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle()

  const tier: SubscriptionTier = (suscripcion?.tier?.toLowerCase() as SubscriptionTier) ?? 'free'

  if (!puedeUsarFeature(tier, feature)) {
    return {
      error: NextResponse.json(
        { error: `Requiere plan ${tierMinimoPara(feature)}` },
        { status: 403 }
      ),
      usuario: null
    }
  }

  return { error: null, usuario: { ...user, tier } }
}
