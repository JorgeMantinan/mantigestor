import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

interface ClasificacionResultado {
  tipo: 'nomina' | 'factura' | 'alquiler' | 'extracto_banco' | 'otro'
  confianza: number
  campos: Record<string, string | number | null>
  resumen: string
}

async function clasificarDocumento(pdfUrl: string): Promise<ClasificacionResultado> {
  const response = await fetch(pdfUrl)
  if (!response.ok) throw new Error('No se pudo descargar el documento')
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = response.headers.get('content-type')?.includes('pdf') ? 'application/pdf' : 'application/pdf'

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Analiza este documento fiscal y clasifícalo en UNA de estas categorías:
- nomina: nómina, recibo de salario, certificado de retenciones
- factura: factura emitida o recibida, albarán
- alquiler: contrato de alquiler, recibo de alquiler,Liquidación de alquiler
- extracto_banco: extracto bancario, movimiento bancario, resumen de cuenta
- otro: cualquier otro tipo de documento

Responde SOLO con JSON válido (sin markdown) con esta estructura:
{
  "tipo": "nomina|factura|alquiler|extracto_banco|otro",
  "confianza": 0.0-1.0,
  "campos": {
    // Para nómina: salario bruto, retencionIrpf, cuotaSeguridadSocial, neto
    // Para factura: numero, emisorReceptor, baseImponible, iva, total
    // Para alquiler: inquilino, importeMensual, fianza
    // Para extracto: banco, periodo, saldoInicial, saldoFinal
    // Rellenar solo los campos que apliquen y sean legibles
  },
  "resumen": "Descripción breve del documento en una línea"
}`,
          },
        ],
      }],
    }),
  })

  if (!aiResponse.ok) {
    const err = await aiResponse.text()
    throw new Error(`Error IA: ${err}`)
  }

  const data = await aiResponse.json()
  const texto = data.content?.[0]?.text ?? ''

  // Extraer JSON de la respuesta
  const jsonMatch = texto.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Respuesta IA sin JSON válido')

  return JSON.parse(jsonMatch[0]) as ClasificacionResultado
}

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    // Check PRO subscription
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n: string) => req.cookies.get(n)?.value, set: () => {}, remove: () => {} } }
    )
    const { data: sub } = await supabase
      .from('suscripciones')
      .select('tier, estado')
      .eq('perfilId', perfilId)
      .in('estado', ['active', 'trialing'])
      .order('currentPeriodStart', { ascending: false })
      .limit(1)
      .single()

    if (!sub || sub.tier !== 'PRO') {
      return NextResponse.json(
        { error: 'La clasificación de documentos requiere Plan Pro', requierePro: true },
        { status: 403 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API de IA no configurada' }, { status: 503 })
    }

    const { pdfUrl } = await req.json()
    if (!pdfUrl || typeof pdfUrl !== 'string') {
      return badRequest('pdfUrl requerido')
    }

    const resultado = await clasificarDocumento(pdfUrl)
    return NextResponse.json(resultado)
  } catch (error) {
    return serverError(error)
  }
}
