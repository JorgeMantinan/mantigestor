'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { isChunkLoadError, tryChunkReload } from '@/lib/chunk-error'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()
  const esErrorChunk = isChunkLoadError(error)

  useEffect(() => {
    if (esErrorChunk) tryChunkReload()
  }, [esErrorChunk])

  if (esErrorChunk) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t('error.actualizandoApp')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
          <h2 className="text-xl font-semibold">{t('error.algoSalioMal')}</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={reset}>{t('error.intentarDeNuevo')}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
