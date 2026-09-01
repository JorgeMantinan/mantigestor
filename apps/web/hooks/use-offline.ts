'use client'

import { useCallback, useEffect, useState } from 'react'
import { guardarOffline, obtenerOffline } from '@/lib/offline-db'
import { useAuth } from '@/hooks/useAuth'

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false)
  const [cachedData, setCachedData] = useState<unknown[]>([])
  const { user } = useAuth()

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
    if (user?.id) {
      const cached = obtenerOffline<unknown[]>(`facturas_${user.id}`)
      if (cached) setCachedData(cached)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    if (navigator.onLine) {
      fetch(`/api/fiscal/facturas?perfilId=${user.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCachedData(data)
            guardarOffline(`facturas_${user.id}`, data)
          }
        })
        .catch(() => {})
    }
  }, [user?.id])

  const saveForOffline = useCallback(
    (clave: string, datos: unknown) => {
      guardarOffline(clave, datos)
    },
    [],
  )

  return { isOffline, cachedData, saveForOffline }
}
