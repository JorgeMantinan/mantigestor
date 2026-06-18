import { FEATURES_POR_TIER } from '@mantigestor/types'
import type { Feature, SubscriptionTier } from '@mantigestor/types'

export function puedeUsarFeature(tier: SubscriptionTier, feature: Feature): boolean {
  return FEATURES_POR_TIER[tier].includes(feature)
}

export function tierMinimoPara(feature: Feature): SubscriptionTier {
  if (FEATURES_POR_TIER.free.includes(feature)) return 'free'
  if (FEATURES_POR_TIER.basic.includes(feature)) return 'basic'
  return 'pro'
}
