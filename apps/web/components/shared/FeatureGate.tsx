'use client'

import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { FEATURES_POR_TIER } from '@mantigestor/types'
import type { Feature, SubscriptionTier } from '@mantigestor/types'
import Link from 'next/link'

function tierMinimoPara(feature: Feature): SubscriptionTier {
  if (FEATURES_POR_TIER.free.includes(feature)) return 'free'
  if (FEATURES_POR_TIER.basic.includes(feature)) return 'basic'
  return 'pro'
}

interface Props {
  feature: Feature
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback }: Props) {
  const { puedeUsar } = useFeatureAccess()

  if (puedeUsar(feature)) return <>{children}</>

  if (fallback) return <>{fallback}</>

  const tierNecesario = tierMinimoPara(feature)
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center">
      <p className="mb-3 text-sm text-muted-foreground">
        Esta función requiere el plan <strong>{tierNecesario}</strong>
      </p>
      <Link
        href="/precios"
        className="text-sm font-medium text-primary hover:underline"
      >
        Ver planes &rarr;
      </Link>
    </div>
  )
}
