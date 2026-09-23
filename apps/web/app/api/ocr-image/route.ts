import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { OcrResult } from '@/lib/ocr'
import { getAuthenticatedUser } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { sugerirModelos } from '@mantigestor/utils'

/**
 * POST /api/ocr-image
 * Body: { image: string (base64 data URL), mediaType: string }
 * Returns: OcrResult from image (receipt, factura, ticket)
 */

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const { success } = await rateLimitByIp(request)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { image, mediaType } = await request.json()

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 })
    }

    const mimeRaw: unknown = mediaType ?? (image.match(/data:(.*?);/)?.[1] ?? 'image/jpeg')
    const mime = typeof mimeRaw === 'string' && (TIPOS_PERMITIDOS as readonly string[]).includes(mimeRaw)
      ? mimeRaw as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      : null
    if (!mime) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa JPG, PNG, WebP o GIF' },
        { status: 400 }
      )
    }

    const partes = image.split(',')
    const base64Data = partes.length > 1 ? partes[1] : image
    if (!base64Data) {
      return NextResponse.json({ error: 'Imagen inválida' }, { status: 400 })
    }
    if (base64Data.length > TAMANO_MAXIMO_BYTES * (4 / 3)) {
      return NextResponse.json(
        { error: 'La imagen supera el tamaño máximo de 5MB' },
        { status: 413 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key de Anthropic no configurada' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mime,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Extrae los datos de esta imagen (factura, recibo o ticket) en español.
Devuelve SOLO un objeto JSON válido sin explicaciones adicionales, con estos campos.
Ejemplo (los importes van en EUROS, sin multiplicar):
{
  "numero": "F-2024-001",
  "emisorReceptor": "Suministros Express S.L.",
  "nifContraparte": "B12345678",
  "fechaEmision": "2024-06-15",
  "baseImponible": 100.00,
  "iva": 21,
  "total": 121.00,
  "tipo": "gasto",
  "categoriaGasto": "suministros",
  "modelosSugeridos": [{"modelo": "303", "razon": "IVA soportado en liquidación trimestral"}]
}
Reglas:
- "tipo": "ingreso" si es una factura emitida, "gasto" si es recibida
- "iva": porcentaje (21, 10, 4 o 0), NO el importe
- "baseImponible" y "total": importes en euros (100.00, no 10000)
- categoriaGasto: "suministros" | "alquiler" | "nómina" | "seguridad-social" | "marketing" | "seguros" | "profesionales" | "material" | "transporte" | "comunicaciones" | "formación" | "otros" | null (si es gasto, clasifícalo según el concepto)
- modelosSugeridos: SOLO los modelos AEAT realmente afectados; si no puedes determinarlos, array []
Si no encuentras un valor, pon null.`,
            },
          ],
        },
      ],
    })

    const block = response.content[0]
    const text = block?.type === 'text' ? block.text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No se pudo extraer datos de la imagen' }, { status: 422 })
    }

    const data = JSON.parse(jsonMatch[0])

    // OcrResult en EUROS: los formularios hacen parseFloat(valor)*100 al guardar
    const modelos = Array.isArray(data.modelosSugeridos) && data.modelosSugeridos.length > 0
      ? data.modelosSugeridos
      : sugerirModelos({
          tipo: data.tipo,
          iva: data.iva,
          baseImponible: data.baseImponible,
          nifContraparte: data.nifContraparte,
        }).map(m => ({ modelo: m.modelo, razon: m.razon }))

    const result: OcrResult = {
      numero: data.numero || null,
      emisorReceptor: data.emisorReceptor || null,
      nifContraparte: data.nifContraparte || null,
      fechaEmision: data.fechaEmision || null,
      baseImponible: typeof data.baseImponible === 'number' ? data.baseImponible : null,
      iva: typeof data.iva === 'number' ? data.iva : null,
      total: typeof data.total === 'number' ? data.total : null,
      tipo: data.tipo === 'ingreso' || data.tipo === 'gasto' ? data.tipo : null,
      categoriaGasto: data.categoriaGasto || null,
      modelosSugeridos: modelos,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('OCR image error:', error)
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    )
  }
}
