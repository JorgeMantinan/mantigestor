import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { OcrResult } from '@/lib/ocr'
import { getAuthenticatedUser } from '@/lib/api-helpers'

/**
 * POST /api/ocr-image
 * Body: { image: string (base64 data URL), mediaType: string }
 * Returns: OcrResult from image (receipt, factura, ticket)
 */

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { image, mediaType } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key de Anthropic no configurada' }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey })

    // Strip data URL prefix if present
    const base64Data = image.includes(',') ? image.split(',')[1] : image
    const mime = mediaType || (image.match(/data:(.*?);/)?.[1] ?? 'image/jpeg')

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
Devuelve SOLO un objeto JSON válido sin explicaciones adicionales, con estos campos:
{
  "numero": "número de factura o recibo",
  "emisorReceptor": "nombre del emisor o receptor según el contexto",
  "nifContraparte": "NIF/CIF de la otra parte",
  "fechaEmision": "fecha en formato YYYY-MM-DD",
  "baseImponible": 123.45,
  "iva": 21,
  "total": 149.37,
  "tipo": "ingreso" si es una factura emitida, "gasto" si es recibida,
  "categoriaGasto": "suministros" | "alquiler" | "nómina" | "seguridad-social" | "marketing" | "seguros" | "profesionales" | "material" | "transporte" | "comunicaciones" | "formación" | "otros" | null,
  "modelosSugeridos": [
    {"modelo": "303", "razon": "IVA repercutido en liquidación trimestral"},
    {"modelo": "130", "razon": "Ingreso en pagos fraccionados IRPF"}
  ]
}

Para categoriaGasto, si es gasto, clasifícalo según el concepto.
Para modelosSugeridos, incluye SOLO los modelos AEAT realmente afectados.
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

    const result: OcrResult = {
      numero: data.numero || null,
      emisorReceptor: data.emisorReceptor || null,
      nifContraparte: data.nifContraparte || null,
      fechaEmision: data.fechaEmision || null,
      baseImponible: typeof data.baseImponible === 'number' ? Math.round(data.baseImponible * 100) : null,
      iva: typeof data.iva === 'number' ? data.iva : null,
      total: typeof data.total === 'number' ? Math.round(data.total * 100) : null,
      tipo: data.tipo || null,
      categoriaGasto: data.categoriaGasto || null,
      modelosSugeridos: Array.isArray(data.modelosSugeridos) ? data.modelosSugeridos : [],
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
