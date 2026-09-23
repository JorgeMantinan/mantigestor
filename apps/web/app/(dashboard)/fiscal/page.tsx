import { Suspense } from 'react'
import type { Metadata } from 'next'
import FiscalPage from './page-client'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Fiscal - MantiGestor',
  description: 'Calculadoras fiscales y modelos impositivos',
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <FiscalPage />
    </Suspense>
  )
}