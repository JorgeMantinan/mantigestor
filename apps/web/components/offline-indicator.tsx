'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { getSyncQueue, processSyncQueue } from '@/lib/cache-offline'

export function OfflineIndicator() {
  const [status, setStatus] = useState<'offline' | 'online' | 'syncing' | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const { t } = useLanguage()

  const updatePendingCount = useCallback(() => {
    const queue = getSyncQueue()
    setPendingCount(queue.length)
  }, [])

  useEffect(() => {
    const handleOffline = () => setStatus('offline')
    const handleOnline = () => {
      setStatus('syncing')
      processSyncQueue().then(() => {
        updatePendingCount()
        setStatus('online')
      })
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    window.addEventListener('sync-complete', updatePendingCount)

    updatePendingCount()

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('sync-complete', updatePendingCount)
    }
  }, [updatePendingCount])

  useEffect(() => {
    if (status === 'online') {
      const timer = setTimeout(() => setStatus(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [status])

  if (!status && pendingCount === 0) return null

  const bgColor = status === 'offline'
    ? 'hsl(0 84% 60%)'
    : status === 'syncing'
    ? 'hsl(38 92% 50%)'
    : 'hsl(142 71% 45%)'

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2 shadow-lg"
      style={{ backgroundColor: bgColor, color: 'white' }}
      role="status"
      aria-live="polite"
    >
      {status === 'offline' ? (
        <WifiOff className="h-4 w-4" aria-hidden="true" />
      ) : status === 'syncing' ? (
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Wifi className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="text-sm font-medium">
        {status === 'offline'
          ? t('offlineIndicator.modoOffline')
          : status === 'syncing'
          ? t('offlineIndicator.sincronizando')
          : t('offlineIndicator.conexionRestaurada')}
        {pendingCount > 0 && status !== 'offline' && (
          <span className="ml-1 text-xs opacity-80">
            ({pendingCount} {t('offlineIndicator.pendientes')})
          </span>
        )}
      </span>
    </div>
  )
}
