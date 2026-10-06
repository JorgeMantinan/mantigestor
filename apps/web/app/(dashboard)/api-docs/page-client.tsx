'use client'

import { useEffect, useRef } from 'react'

/**
 * Swagger UI auto-hospedado: los assets viven en /public/swagger (copiados de
 * swagger-ui-dist). Antes se cargaban desde unpkg.com — dependía de un tercero
 * y requería abrir la CSP a ese dominio.
 */
export default function ApiDocsPageClient() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vivo = true

    const cargar = async () => {
      if (!document.querySelector('link[href="/swagger/swagger-ui.css"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = '/swagger/swagger-ui.css'
        document.head.appendChild(link)
      }

      if (!document.querySelector('script[src="/swagger/swagger-ui-bundle.js"]')) {
        await new Promise<void>((resolver, rechazar) => {
          const script = document.createElement('script')
          script.src = '/swagger/swagger-ui-bundle.js'
          script.onload = () => resolver()
          script.onerror = () => rechazar(new Error('No se pudo cargar Swagger UI'))
          document.body.appendChild(script)
        })
      }

      if (!vivo || !ref.current) return
      ref.current.innerHTML = ''
      const win = window as unknown as Record<string, unknown>
      const SwaggerUIBundle = win['SwaggerUIBundle'] as
        | ((config: Record<string, unknown>) => void)
        | undefined
      SwaggerUIBundle?.({
        url: '/api/docs',
        domNode: ref.current,
        layout: 'BaseLayout',
        // Envía las cookies de sesión en "Try it out" (la API autentica por cookie)
        withCredentials: true,
        // Sin badge de validador externo: la CSP bloquea validator.swagger.io
        // y no aporta nada (el spec es local)
        validatorUrl: null,
      })
    }

    void cargar().catch(() => {
      // recurso local: solo falla si se pierde el archivo de /public
    })

    return () => {
      vivo = false
    }
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
