'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineIndicator() {
  const [status, setStatus] = useState<'offline' | 'online' | null>(null)

  useEffect(() => {
    const handleOffline = () => setStatus('offline')
    const handleOnline = () => setStatus('online')
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  useEffect(() => {
    if (status === 'online') {
      const timer = setTimeout(() => setStatus(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [status])

  if (!status) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2 shadow-lg"
      style={{
        backgroundColor: status === 'offline' ? 'hsl(0 84% 60%)' : 'hsl(142 71% 45%)',
        color: 'white',
      }}
      role="status"
      aria-live="polite"
    >
      {status === 'offline' ? (
        <WifiOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Wifi className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="text-sm font-medium">
        {status === 'offline' ? 'Modo offline' : 'Conexión restaurada'}
      </span>
    </div>
  )
}
