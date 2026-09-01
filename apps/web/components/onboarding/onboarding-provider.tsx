'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { OnboardingWizard } from './onboarding-wizard'

const STORAGE_KEY = 'mantigestor_onboarding_completado'

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, cargando } = useAuth()
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    if (cargando || !user) return

    const completado = localStorage.getItem(STORAGE_KEY)
    if (!completado) {
      setMostrar(true)
    }
  }, [user, cargando])

  return (
    <>
      <OnboardingWizard abierto={mostrar} onCompletado={() => setMostrar(false)} />
      {children}
    </>
  )
}
