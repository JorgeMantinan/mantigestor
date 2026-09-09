'use client'

import { useEffect, useRef } from 'react'

export default function ApiDocsPageClient() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js'
    script.onload = () => {
      if (ref.current) {
        ref.current.innerHTML = ''
        const win = window as unknown as Record<string, unknown>
        const SwaggerUIBundle = win['SwaggerUIBundle'] as
          | ((config: Record<string, unknown>) => void)
          | undefined
        if (SwaggerUIBundle) {
          SwaggerUIBundle({
            url: '/api/docs',
            domNode: ref.current,
            layout: 'BaseLayout',
          })
        }
      }
    }
    document.body.appendChild(script)
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">API Docs</h1>
        <p className="text-muted-foreground">Documentación interactiva de la API de MantiGestor</p>
      </div>
      <div ref={ref} />
    </div>
  )
}
