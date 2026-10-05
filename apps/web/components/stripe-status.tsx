'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { CreditCard } from 'lucide-react'

export function StripeStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/stripe/status', { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => setConfigured(data.configured ?? false))
      .catch(() => setConfigured(false))
    return () => ctrl.abort()
  }, [])

  if (configured === null) return null

  return (
    <Badge
      variant={configured ? 'default' : 'destructive'}
      className="gap-1 text-xs"
    >
      <CreditCard className="h-3 w-3" aria-hidden="true" />
      {configured ? 'Stripe conectado' : 'Stripe no configurado'}
    </Badge>
  )
}
