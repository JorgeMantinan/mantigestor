'use client'

import { useCallback, useEffect, useState } from 'react'
import { guardarOffline, obtenerOffline } from '@/lib/offline-db'
import { useAuth } from '@/hooks/useAuth'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false)
  const [cachedData, setCachedData] = useState<unknown[]>([])
  const { user } = useAuth()
  const { perfilActivoId } = usePersonaActiva()
  const activePerfilId = perfilActivoId ?? user?.id

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (activePerfilId) {
      const cached = obtenerOffline<unknown[]>(`facturas_${activePerfilId}`)
      if (cached) setCachedData(cached)
    }
  }, [activePerfilId])

  useEffect(() => {
    if (!activePerfilId) return
    if (navigator.onLine) {
      fetch(`/api/fiscal/facturas?perfilId=${activePerfilId}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCachedData(data)
            guardarOffline(`facturas_${activePerfilId}`, data)
          }
        })
        .catch(() => {})
    }
  }, [activePerfilId])

  const saveForOffline = useCallback(
    (clave: string, datos: unknown) => {
      guardarOffline(clave, datos)
    },
    [],
  )

  return { isOffline, cachedData, saveForOffline }
}
