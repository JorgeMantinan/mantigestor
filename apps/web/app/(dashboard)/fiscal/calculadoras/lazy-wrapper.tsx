'use client'

import React, { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

function CalculatorSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

export function LazyCalculator({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback ?? <CalculatorSkeleton />}>
      {children}
    </Suspense>
  )
}

export function createLazyCalculator<T extends Record<string, unknown>>(
  factory: () => Promise<{ default: React.ComponentType<T> }>,
) {
  return React.lazy(factory)
}
