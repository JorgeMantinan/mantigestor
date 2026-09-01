'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, ExternalLink } from 'lucide-react'

type Param = { name: string; type: string; required: boolean; description: string }
type ResponseField = { field: string; type: string; description: string }
type Route = {
  path: string
  method: 'GET' | 'POST' | 'DELETE'
  title: string
  description: string
  auth: boolean
  params?: Param[]
  queryParams?: Param[]
  bodyExample?: string
  responseExample: string
  responseFields: ResponseField[]
}

const routes: Route[] = [
  {
    path: '/api/ocr',
    method: 'POST',
    title: 'OCR de factura (PDF)',
    description: 'Extrae datos de una factura a partir de su URL de PDF usando IA (Claude).',
    auth: true,
    params: [
      { name: 'pdfUrl', type: 'string', required: true, description: 'URL pública del PDF de la factura' },
    ],
    responseExample: `{
  "numero": "F-2026-001",
  "emisorReceptor": "Proveedor S.L.",
  "nifContraparte": "B12345678",
  "fechaEmision": "2026-08-15",
  "baseImponible": 10000,
  "iva": 2100,
  "total": 12100,
  "tipo": "ingreso",
  "categoriaGasto": "profesionales",
  "modelosSugeridos": [
    { "modelo": "303", "razon": "IVA repercutido" }
  ]
}`,
    responseFields: [
      { field: 'numero', type: 'string | null', description: 'Número de factura' },
      { field: 'emisorReceptor', type: 'string | null', description: 'Nombre del emisor o receptor' },
      { field: 'nifContraparte', type: 'string | null', description: 'NIF/CIF de la contraparte' },
      { field: 'fechaEmision', type: 'string | null', description: 'Fecha YYYY-MM-DD' },
      { field: 'baseImponible', type: 'number | null', description: 'Base imponible en céntimos' },
      { field: 'iva', type: 'number | null', description: 'Porcentaje de IVA' },
      { field: 'total', type: 'number | null', description: 'Total en céntimos' },
      { field: 'tipo', type: 'string | null', description: '"ingreso" o "gasto"' },
      { field: 'categoriaGasto', type: 'string | null', description: 'Categoría del gasto' },
      { field: 'modelosSugeridos', type: 'array', description: 'Modelos AEAT sugeridos' },
    ],
  },
  {
    path: '/api/ocr-image',
    method: 'POST',
    title: 'OCR de imagen',
    description: 'Extrae datos de una factura, recibo o ticket a partir de una imagen en base64.',
    auth: false,
    params: [
      { name: 'image', type: 'string', required: true, description: 'Imagen en base64 (data URL o raw)' },
      { name: 'mediaType', type: 'string', required: false, description: 'MIME type (image/jpeg, image/png, etc.)' },
    ],
    responseExample: `{
  "numero": "T-456",
  "emisorReceptor": "Tienda XYZ",
  "nifContraparte": null,
  "fechaEmision": "2026-08-20",
  "baseImponible": 4132,
  "iva": 21,
  "total": 5000,
  "tipo": "gasto",
  "categoriaGasto": "material",
  "modelosSugeridos": []
}`,
    responseFields: [
      { field: 'numero', type: 'string | null', description: 'Número de factura/recibo' },
      { field: 'emisorReceptor', type: 'string | null', description: 'Nombre del emisor' },
      { field: 'nifContraparte', type: 'string | null', description: 'NIF/CIF' },
      { field: 'fechaEmision', type: 'string | null', description: 'Fecha YYYY-MM-DD' },
      { field: 'baseImponible', type: 'number | null', description: 'Base imponible en céntimos' },
      { field: 'iva', type: 'number | null', description: 'Porcentaje de IVA' },
      { field: 'total', type: 'number | null', description: 'Total en céntimos' },
      { field: 'tipo', type: 'string | null', description: '"ingreso" o "gasto"' },
      { field: 'categoriaGasto', type: 'string | null', description: 'Categoría del gasto' },
      { field: 'modelosSugeridos', type: 'array', description: 'Modelos AEAT sugeridos' },
    ],
  },
  {
    path: '/api/factura-publica',
    method: 'GET',
    title: 'Factura pública',
    description: 'Devuelve los datos de una factura emitida para visualización pública (portal de cliente).',
    auth: false,
    queryParams: [
      { name: 'token', type: 'string', required: true, description: 'ID de la factura' },
    ],
    responseExample: `{
  "id": "uuid-factura",
  "numero": "F-2026-001",
  "tipo": "ingreso",
  "emisorReceptor": "Cliente S.A.",
  "nifContraparte": "A87654321",
  "fechaEmision": "2026-08-15",
  "baseImponible": 50000,
  "iva": 10500,
  "total": 60500,
  "estado": "pagada",
  "notas": null
}`,
    responseFields: [
      { field: 'id', type: 'string', description: 'UUID de la factura' },
      { field: 'numero', type: 'string', description: 'Número de factura' },
      { field: 'tipo', type: 'string', description: '"ingreso"' },
      { field: 'emisorReceptor', type: 'string', description: 'Nombre del cliente' },
      { field: 'baseImponible', type: 'number', description: 'Base imponible en céntimos' },
      { field: 'iva', type: 'number', description: 'IVA en céntimos' },
      { field: 'total', type: 'number', description: 'Total en céntimos' },
      { field: 'estado', type: 'string', description: 'Estado de la factura' },
    ],
  },
  {
    path: '/api/cliente-portal',
    method: 'GET',
    title: 'Portal de cliente',
    description: 'Devuelve todas las facturas emitidas de un cliente identificado por token. Retrocompatible con tokens de factura individual.',
    auth: false,
    queryParams: [
      { name: 'token', type: 'string', required: true, description: 'Token del cliente o ID de factura' },
    ],
    responseExample: `{
  "facturas": [
    {
      "id": "uuid",
      "numero": "F-2026-001",
      "tipo": "ingreso",
      "emisorReceptor": "Cliente S.A.",
      "fechaEmision": "2026-08-15",
      "fechaVencimiento": "2026-09-15",
      "baseImponible": 50000,
      "iva": 10500,
      "total": 60500,
      "estado": "pagada"
    }
  ],
  "tokenCliente": "token-del-cliente"
}`,
    responseFields: [
      { field: 'facturas', type: 'array', description: 'Lista de facturas emitidas del cliente' },
      { field: 'tokenCliente', type: 'string | null', description: 'Token del cliente' },
    ],
  },
  {
    path: '/api/tipos-cambio',
    method: 'GET',
    title: 'Tipos de cambio',
    description: 'Proxy de la API de Frankfurter para obtener tasas de cambio en tiempo real desde EUR.',
    auth: false,
    responseExample: `{
  "rates": {
    "USD": 1.08,
    "GBP": 0.85,
    "CHF": 0.96,
    "MXN": 19.5,
    "ARS": 950,
    "COP": 4200
  },
  "date": "2026-08-30",
  "base": "EUR"
}`,
    responseFields: [
      { field: 'rates', type: 'object', description: 'Tasas de cambio desde EUR' },
      { field: 'date', type: 'string', description: 'Fecha de las tasas' },
      { field: 'base', type: 'string', description: 'Moneda base' },
    ],
  },
  {
    path: '/api/stripe/checkout',
    method: 'POST',
    title: 'Stripe Checkout',
    description: 'Crea una sesión de checkout de Stripe para suscripción PRO.',
    auth: true,
    responseExample: `{
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}`,
    responseFields: [
      { field: 'url', type: 'string', description: 'URL de la sesión de checkout de Stripe' },
    ],
  },
  {
    path: '/api/stripe/portal',
    method: 'POST',
    title: 'Stripe Portal',
    description: 'Crea una sesión del portal de cliente de Stripe para gestionar la suscripción.',
    auth: true,
    responseExample: `{
  "url": "https://billing.stripe.com/p/session/..."
}`,
    responseFields: [
      { field: 'url', type: 'string', description: 'URL del portal de Stripe' },
    ],
  },
  {
    path: '/api/stripe/webhook',
    method: 'POST',
    title: 'Stripe Webhook',
    description: 'Endpoint de webhook para eventos de Stripe (checkout.session.completed, invoice.paid, subscription updates/deletions).',
    auth: false,
    params: [
      { name: 'stripe-signature', type: 'header', required: true, description: 'Firma del webhook de Stripe' },
    ],
    responseExample: `{
  "received": true
}`,
    responseFields: [
      { field: 'received', type: 'boolean', description: 'Confirmación de recepción' },
    ],
  },
  {
    path: '/api/fiscal/mis-personas',
    method: 'GET',
    title: 'Mis personas',
    description: 'Lista las personas asociadas al usuario actual (gestiones de otros usuarios).',
    auth: true,
    responseExample: `{
  "personas": [
    {
      "perfilId": "uuid",
      "nombre": "María García",
      "email": "maria@email.com",
      "rol": "gestor"
    }
  ],
  "perfilPropioId": "uuid-del-perfil-propio"
}`,
    responseFields: [
      { field: 'personas', type: 'array', description: 'Lista de personas asociadas' },
      { field: 'personas[].perfilId', type: 'string', description: 'ID del perfil asociado' },
      { field: 'personas[].nombre', type: 'string', description: 'Nombre de la persona' },
      { field: 'personas[].email', type: 'string', description: 'Email de la persona' },
      { field: 'personas[].rol', type: 'string', description: 'Rol de la asociación' },
      { field: 'perfilPropioId', type: 'string | null', description: 'ID del propio perfil' },
    ],
  },
  {
    path: '/api/fiscal/asociar-persona',
    method: 'POST',
    title: 'Asociar persona',
    description: 'Crea un perfil temporal y asocia una persona al usuario actual. Envía email de invitación si Resend está configurado.',
    auth: true,
    params: [
      { name: 'email', type: 'string', required: true, description: 'Email de la persona a asociar' },
      { name: 'nombre', type: 'string', required: false, description: 'Nombre de la persona' },
      { name: 'nif', type: 'string', required: false, description: 'NIF/CIF de la persona' },
    ],
    responseExample: `{
  "ok": true,
  "perfilId": "uuid-del-nuevo-perfil"
}`,
    responseFields: [
      { field: 'ok', type: 'boolean', description: 'true si se creó correctamente' },
      { field: 'perfilId', type: 'string', description: 'ID del perfil creado' },
    ],
  },
  {
    path: '/api/fiscal/desasociar-persona',
    method: 'DELETE',
    title: 'Desasociar persona',
    description: 'Elimina la asociación entre el usuario actual y una persona gestionada.',
    auth: true,
    queryParams: [
      { name: 'perfilId', type: 'string', required: true, description: 'ID del perfil a desasociar' },
    ],
    responseExample: `{
  "ok": true
}`,
    responseFields: [
      { field: 'ok', type: 'boolean', description: 'true si se eliminó correctamente' },
    ],
  },
]

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    POST: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
    DELETE: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-bold ${colors[method] ?? ''}`}>
      {method}
    </span>
  )
}

function RouteCard({ route }: { route: Route }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <MethodBadge method={route.method} />
          <code className="text-sm font-mono font-semibold">{route.path}</code>
          {route.auth && (
            <Badge variant="secondary" className="text-[10px] ml-auto">Auth requerida</Badge>
          )}
        </div>
        <CardTitle className="text-lg mt-2">{route.title}</CardTitle>
        <CardDescription>{route.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(route.params && route.params.length > 0) && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Body params</h4>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Campo</th>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium">Req.</th>
                    <th className="px-3 py-2 text-left font-medium">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {route.params.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                      <td className="px-3 py-2">{p.required ? <span className="text-destructive font-medium">Sí</span> : 'No'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(route.queryParams && route.queryParams.length > 0) && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Query params</h4>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Param</th>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium">Req.</th>
                    <th className="px-3 py-2 text-left font-medium">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {route.queryParams.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                      <td className="px-3 py-2">{p.required ? <span className="text-destructive font-medium">Sí</span> : 'No'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2">Respuesta</h4>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Campo</th>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {route.responseFields.map((f) => (
                  <tr key={f.field} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{f.field}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Ejemplo de respuesta</h4>
          <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto font-mono">
            {route.responseExample}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Docs</h1>
          <p className="text-sm text-muted-foreground">
            Documentación de las rutas públicas y autenticadas de MantiGestor.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-mono">POST</Badge> <span>Requiere body JSON</span>
        <span className="mx-1">·</span>
        <Badge variant="outline" className="font-mono">GET</Badge> <span>Query params en URL</span>
        <span className="mx-1">·</span>
        <Badge variant="outline" className="font-mono">DELETE</Badge> <span>Query params en URL</span>
      </div>

      <div className="grid gap-6">
        {routes.map((route) => (
          <RouteCard key={`${route.method}-${route.path}`} route={route} />
        ))}
      </div>
    </div>
  )
}
