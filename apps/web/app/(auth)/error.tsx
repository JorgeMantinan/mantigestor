'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { isChunkLoadError, tryChunkReload } from '@/lib/chunk-error'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const esErrorChunk = isChunkLoadError(error)

  useEffect(() => {
    if (esErrorChunk) tryChunkReload()
  }, [esErrorChunk])

  if (esErrorChunk) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="mx-auto max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Actualizando la aplicación…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Algo salió mal</h2>
          <p className="text-sm text-muted-foreground">{error.digest ? `Ref: ${error.digest}` : 'Se ha producido un error inesperado.'}</p>
          <Button onClick={reset}>Intentar de nuevo</Button>
        </CardContent>
      </Card>
    </div>
  )
}
