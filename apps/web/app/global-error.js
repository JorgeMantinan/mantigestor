'use client'

import * as Sentry from '@sentry/nextjs'

function reportError(error) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn || process.env.NODE_ENV !== 'production') return
  Sentry.init({ dsn, tracesSampleRate: 0.1, integrations: [] })
  void Sentry.captureException(error)
}

export default function GlobalError({ error, reset }) {
  reportError(error)
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#fafafa' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#18181b',
          }}
        >
          <div
            style={{
              maxWidth: 420,
              padding: 40,
              borderRadius: 12,
              background: '#fff',
              border: '1px solid #e4e4e7',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40 }}>⚠️</div>
            <h1 style={{ fontSize: 20, margin: '12px 0 8px' }}>Algo salió mal</h1>
            <p style={{ fontSize: 14, color: '#71717a', margin: '0 0 20px' }}>
              Ha ocurrido un error inesperado. Vuelve a intentarlo.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#eab308',
                color: '#18181b',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}