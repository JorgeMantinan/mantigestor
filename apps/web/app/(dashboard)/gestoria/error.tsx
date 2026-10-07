'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { isChunkLoadError, tryChunkReload } from '@/lib/chunk-error'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage()
  const esErrorChunk = isChunkLoadError(error)

  useEffect(() => {
    if (esErrorChunk) tryChunkReload()
  }, [esErrorChunk])

  if (esErrorChunk) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">{t('error.actualizandoApp')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">{t('error.algoSalioMal')}</h2>
      <p className="text-sm text-muted-foreground">{error.digest ? `Ref: ${error.digest}` : 'Se ha producido un error inesperado.'}</p>
      <button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
        {t('error.intentarDeNuevo')}
      </button>
    </div>
  )
}
