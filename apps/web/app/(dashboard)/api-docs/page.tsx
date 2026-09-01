'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, ExternalLink } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

type Param = { name: string; type: string; required: boolean; descriptionEs: string; descriptionEn: string }
type ResponseField = { field: string; type: string; descriptionEs: string; descriptionEn: string }
type Route = {
  path: string
  method: 'GET' | 'POST' | 'DELETE'
  titleKey: string
  descriptionKey: string
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
    titleKey: 'apiDocs.ocrFacturaPdf',
    descriptionKey: 'apiDocs.ocrFacturaPdfDesc',
    auth: true,
    params: [
      { name: 'pdfUrl', type: 'string', required: true, descriptionEs: 'URL pública del PDF de la factura', descriptionEn: 'Public URL of the invoice PDF' },
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
      { field: 'numero', type: 'string | null', descriptionEs: 'Número de factura', descriptionEn: 'Invoice number' },
      { field: 'emisorReceptor', type: 'string | null', descriptionEs: 'Nombre del emisor o receptor', descriptionEn: 'Issuer or recipient name' },
      { field: 'nifContraparte', type: 'string | null', descriptionEs: 'NIF/CIF de la contraparte', descriptionEn: 'Counterparty tax ID' },
      { field: 'fechaEmision', type: 'string | null', descriptionEs: 'Fecha YYYY-MM-DD', descriptionEn: 'Date YYYY-MM-DD' },
      { field: 'baseImponible', type: 'number | null', descriptionEs: 'Base imponible en céntimos', descriptionEn: 'Tax base in cents' },
      { field: 'iva', type: 'number | null', descriptionEs: 'Porcentaje de IVA', descriptionEn: 'VAT percentage' },
      { field: 'total', type: 'number | null', descriptionEs: 'Total en céntimos', descriptionEn: 'Total in cents' },
      { field: 'tipo', type: 'string | null', descriptionEs: '"ingreso" o "gasto"', descriptionEn: '"income" or "expense"' },
      { field: 'categoriaGasto', type: 'string | null', descriptionEs: 'Categoría del gasto', descriptionEn: 'Expense category' },
      { field: 'modelosSugeridos', type: 'array', descriptionEs: 'Modelos AEAT sugeridos', descriptionEn: 'Suggested tax forms' },
    ],
  },
  {
    path: '/api/ocr-image',
    method: 'POST',
    titleKey: 'apiDocs.ocrImagen',
    descriptionKey: 'apiDocs.ocrImagenDesc',
    auth: false,
    params: [
      { name: 'image', type: 'string', required: true, descriptionEs: 'Imagen en base64 (data URL o raw)', descriptionEn: 'Base64 image (data URL or raw)' },
      { name: 'mediaType', type: 'string', required: false, descriptionEs: 'MIME type (image/jpeg, image/png, etc.)', descriptionEn: 'MIME type (image/jpeg, image/png, etc.)' },
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
      { field: 'numero', type: 'string | null', descriptionEs: 'Número de factura/recibo', descriptionEn: 'Invoice/receipt number' },
      { field: 'emisorReceptor', type: 'string | null', descriptionEs: 'Nombre del emisor', descriptionEn: 'Issuer name' },
      { field: 'nifContraparte', type: 'string | null', descriptionEs: 'NIF/CIF', descriptionEn: 'Tax ID' },
      { field: 'fechaEmision', type: 'string | null', descriptionEs: 'Fecha YYYY-MM-DD', descriptionEn: 'Date YYYY-MM-DD' },
      { field: 'baseImponible', type: 'number | null', descriptionEs: 'Base imponible en céntimos', descriptionEn: 'Tax base in cents' },
      { field: 'iva', type: 'number | null', descriptionEs: 'Porcentaje de IVA', descriptionEn: 'VAT percentage' },
      { field: 'total', type: 'number | null', descriptionEs: 'Total en céntimos', descriptionEn: 'Total in cents' },
      { field: 'tipo', type: 'string | null', descriptionEs: '"ingreso" o "gasto"', descriptionEn: '"income" or "expense"' },
      { field: 'categoriaGasto', type: 'string | null', descriptionEs: 'Categoría del gasto', descriptionEn: 'Expense category' },
      { field: 'modelosSugeridos', type: 'array', descriptionEs: 'Modelos AEAT sugeridos', descriptionEn: 'Suggested tax forms' },
    ],
  },
  {
    path: '/api/factura-publica',
    method: 'GET',
    titleKey: 'apiDocs.facturaPublica',
    descriptionKey: 'apiDocs.facturaPublicaDesc',
    auth: false,
    queryParams: [
      { name: 'token', type: 'string', required: true, descriptionEs: 'ID de la factura', descriptionEn: 'Invoice ID' },
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
      { field: 'id', type: 'string', descriptionEs: 'UUID de la factura', descriptionEn: 'Invoice UUID' },
      { field: 'numero', type: 'string', descriptionEs: 'Número de factura', descriptionEn: 'Invoice number' },
      { field: 'tipo', type: 'string', descriptionEs: '"ingreso"', descriptionEn: '"income"' },
      { field: 'emisorReceptor', type: 'string', descriptionEs: 'Nombre del cliente', descriptionEn: 'Client name' },
      { field: 'baseImponible', type: 'number', descriptionEs: 'Base imponible en céntimos', descriptionEn: 'Tax base in cents' },
      { field: 'iva', type: 'number', descriptionEs: 'IVA en céntimos', descriptionEn: 'VAT in cents' },
      { field: 'total', type: 'number', descriptionEs: 'Total en céntimos', descriptionEn: 'Total in cents' },
      { field: 'estado', type: 'string', descriptionEs: 'Estado de la factura', descriptionEn: 'Invoice status' },
    ],
  },
  {
    path: '/api/cliente-portal',
    method: 'GET',
    titleKey: 'apiDocs.portalCliente',
    descriptionKey: 'apiDocs.portalClienteDesc',
    auth: false,
    queryParams: [
      { name: 'token', type: 'string', required: true, descriptionEs: 'Token del cliente o ID de factura', descriptionEn: 'Client token or invoice ID' },
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
      { field: 'facturas', type: 'array', descriptionEs: 'Lista de facturas emitidas del cliente', descriptionEn: 'List of client issued invoices' },
      { field: 'tokenCliente', type: 'string | null', descriptionEs: 'Token del cliente', descriptionEn: 'Client token' },
    ],
  },
  {
    path: '/api/tipos-cambio',
    method: 'GET',
    titleKey: 'apiDocs.tiposCambio',
    descriptionKey: 'apiDocs.tiposCambioDesc',
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
      { field: 'rates', type: 'object', descriptionEs: 'Tasas de cambio desde EUR', descriptionEn: 'Exchange rates from EUR' },
      { field: 'date', type: 'string', descriptionEs: 'Fecha de las tasas', descriptionEn: 'Rate date' },
      { field: 'base', type: 'string', descriptionEs: 'Moneda base', descriptionEn: 'Base currency' },
    ],
  },
  {
    path: '/api/stripe/checkout',
    method: 'POST',
    titleKey: 'apiDocs.stripeCheckout',
    descriptionKey: 'apiDocs.stripeCheckoutDesc',
    auth: true,
    responseExample: `{
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}`,
    responseFields: [
      { field: 'url', type: 'string', descriptionEs: 'URL de la sesión de checkout de Stripe', descriptionEn: 'Stripe checkout session URL' },
    ],
  },
  {
    path: '/api/stripe/portal',
    method: 'POST',
    titleKey: 'apiDocs.stripePortal',
    descriptionKey: 'apiDocs.stripePortalDesc',
    auth: true,
    responseExample: `{
  "url": "https://billing.stripe.com/p/session/..."
}`,
    responseFields: [
      { field: 'url', type: 'string', descriptionEs: 'URL del portal de Stripe', descriptionEn: 'Stripe portal URL' },
    ],
  },
  {
    path: '/api/stripe/webhook',
    method: 'POST',
    titleKey: 'apiDocs.stripeWebhook',
    descriptionKey: 'apiDocs.stripeWebhookDesc',
    auth: false,
    params: [
      { name: 'stripe-signature', type: 'header', required: true, descriptionEs: 'Firma del webhook de Stripe', descriptionEn: 'Stripe webhook signature' },
    ],
    responseExample: `{
  "received": true
}`,
    responseFields: [
      { field: 'received', type: 'boolean', descriptionEs: 'Confirmación de recepción', descriptionEn: 'Receipt confirmation' },
    ],
  },
  {
    path: '/api/fiscal/mis-personas',
    method: 'GET',
    titleKey: 'apiDocs.misPersonas',
    descriptionKey: 'apiDocs.misPersonasDesc',
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
      { field: 'personas', type: 'array', descriptionEs: 'Lista de personas asociadas', descriptionEn: 'List of associated people' },
      { field: 'personas[].perfilId', type: 'string', descriptionEs: 'ID del perfil asociado', descriptionEn: 'Associated profile ID' },
      { field: 'personas[].nombre', type: 'string', descriptionEs: 'Nombre de la persona', descriptionEn: 'Person name' },
      { field: 'personas[].email', type: 'string', descriptionEs: 'Email de la persona', descriptionEn: 'Person email' },
      { field: 'personas[].rol', type: 'string', descriptionEs: 'Rol de la asociación', descriptionEn: 'Association role' },
      { field: 'perfilPropioId', type: 'string | null', descriptionEs: 'ID del propio perfil', descriptionEn: 'Own profile ID' },
    ],
  },
  {
    path: '/api/fiscal/asociar-persona',
    method: 'POST',
    titleKey: 'apiDocs.asociarPersona',
    descriptionKey: 'apiDocs.asociarPersonaDesc',
    auth: true,
    params: [
      { name: 'email', type: 'string', required: true, descriptionEs: 'Email de la persona a asociar', descriptionEn: 'Email of the person to add' },
      { name: 'nombre', type: 'string', required: false, descriptionEs: 'Nombre de la persona', descriptionEn: 'Person name' },
      { name: 'nif', type: 'string', required: false, descriptionEs: 'NIF/CIF de la persona', descriptionEn: 'Person tax ID' },
    ],
    responseExample: `{
  "ok": true,
  "perfilId": "uuid-del-nuevo-perfil"
}`,
    responseFields: [
      { field: 'ok', type: 'boolean', descriptionEs: 'true si se creó correctamente', descriptionEn: 'true if created successfully' },
      { field: 'perfilId', type: 'string', descriptionEs: 'ID del perfil creado', descriptionEn: 'Created profile ID' },
    ],
  },
  {
    path: '/api/fiscal/desasociar-persona',
    method: 'DELETE',
    titleKey: 'apiDocs.desasociarPersona',
    descriptionKey: 'apiDocs.desasociarPersonaDesc',
    auth: true,
    queryParams: [
      { name: 'perfilId', type: 'string', required: true, descriptionEs: 'ID del perfil a desasociar', descriptionEn: 'Profile ID to remove' },
    ],
    responseExample: `{
  "ok": true
}`,
    responseFields: [
      { field: 'ok', type: 'boolean', descriptionEs: 'true si se eliminó correctamente', descriptionEn: 'true if removed successfully' },
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

function RouteCard({ route, t }: { route: Route; t: (key: string) => string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <MethodBadge method={route.method} />
          <code className="text-sm font-mono font-semibold">{route.path}</code>
          {route.auth && (
            <Badge variant="secondary" className="text-[10px] ml-auto">{t('apiDocs.authRequerida')}</Badge>
          )}
        </div>
        <CardTitle className="text-lg mt-2">{t(route.titleKey)}</CardTitle>
        <CardDescription>{t(route.descriptionKey)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(route.params && route.params.length > 0) && (
          <div>
            <h4 className="text-sm font-semibold mb-2">{t('apiDocs.bodyParams')}</h4>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">{t('apiDocs.campo')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('apiDocs.tipo')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('apiDocs.req')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('apiDocs.descripcion')}</th>
                  </tr>
                </thead>
                <tbody>
                  {route.params.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                      <td className="px-3 py-2">{p.required ? <span className="text-destructive font-medium">{t('apiDocs.si')}</span> : t('apiDocs.no')}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.descriptionEs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(route.queryParams && route.queryParams.length > 0) && (
          <div>
            <h4 className="text-sm font-semibold mb-2">{t('apiDocs.queryParams')}</h4>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">{t('apiDocs.campo')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('apiDocs.tipo')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('apiDocs.req')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('apiDocs.descripcion')}</th>
                  </tr>
                </thead>
                <tbody>
                  {route.queryParams.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
                      <td className="px-3 py-2">{p.required ? <span className="text-destructive font-medium">{t('apiDocs.si')}</span> : t('apiDocs.no')}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.descriptionEs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2">{t('apiDocs.respuesta')}</h4>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">{t('apiDocs.campo')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('apiDocs.tipo')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('apiDocs.descripcion')}</th>
                </tr>
              </thead>
              <tbody>
                {route.responseFields.map((f) => (
                  <tr key={f.field} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{f.field}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.descriptionEs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">{t('apiDocs.ejemploRespuesta')}</h4>
          <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto font-mono">
            {route.responseExample}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ApiDocsPage() {
  const { t } = useLanguage()
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('apiDocs.titulo')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('apiDocs.subtitulo')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-mono">POST</Badge> <span>{t('apiDocs.requiereBodyJson')}</span>
        <span className="mx-1">·</span>
        <Badge variant="outline" className="font-mono">GET</Badge> <span>{t('apiDocs.queryParamsUrl')}</span>
        <span className="mx-1">·</span>
        <Badge variant="outline" className="font-mono">DELETE</Badge> <span>{t('apiDocs.queryParamsUrl')}</span>
      </div>

      <div className="grid gap-6">
        {routes.map((route) => (
          <RouteCard key={`${route.method}-${route.path}`} route={route} t={t} />
        ))}
      </div>
    </div>
  )
}
