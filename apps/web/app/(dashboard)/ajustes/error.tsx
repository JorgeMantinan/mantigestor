'use client'

import { useEffect } from 'react'
import { isChunkLoadError, tryChunkReload } from '@/lib/chunk-error'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const esErrorChunk = isChunkLoadError(error)

  useEffect(() => {
    if (esErrorChunk) tryChunkReload()
  }, [esErrorChunk])

  if (esErrorChunk) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">Actualizando la aplicación…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">Algo salió mal</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
        Intentar de nuevo
      </button>
    </div>
  )
}
