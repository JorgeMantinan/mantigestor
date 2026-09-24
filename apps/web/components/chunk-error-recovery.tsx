'use client'

import { useEffect } from 'react'
import { isChunkLoadError, tryChunkReload } from '@/lib/chunk-error'

export function ChunkErrorRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        tryChunkReload()
      }
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        tryChunkReload()
      }
    }
    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError, true)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
