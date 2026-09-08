'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-center min-h-screen">
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
