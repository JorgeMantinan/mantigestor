'use client'

import type { Feature } from '@mantigestor/types'
import { useAuth } from './useAuth'

export function useFeatureAccess() {
  const { user } = useAuth()
  return {
    puedeUsar: (_feature: Feature) => !!user,
  }
}
