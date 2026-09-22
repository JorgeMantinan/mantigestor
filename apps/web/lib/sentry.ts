'use client'

import * as Sentry from '@sentry/nextjs'

let initialized = false

export function initSentry(): void {
  if (initialized) return
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
    integrations: [],
    enabled: process.env.NODE_ENV === 'production',
  })

  initialized = true
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!initialized) initSentry()
  Sentry.withScope(scope => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }
    Sentry.captureException(error)
  })
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!initialized) initSentry()
  Sentry.captureMessage(message, level)
}

export function startTransaction(name: string): void {
  if (!initialized) initSentry()
  Sentry.startSpan({ name, op: 'custom' }, () => {})
}
