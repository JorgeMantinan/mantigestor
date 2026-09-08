'use client'

import { useLanguage } from '@/contexts/language-context'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">{t('error.algoSalioMal')}</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
        {t('error.intentarDeNuevo')}
      </button>
    </div>
  )
}
