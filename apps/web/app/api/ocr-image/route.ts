import { NextResponse, type NextRequest } from 'next/server'
import { extraerTextoImagen, parseTextoTicket } from '@/lib/ocr'
import { getAuthenticatedUser } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

/**
 * POST /api/ocr-image
 * Body: { image: string (base64 data URL), mediaType: string }
 * OCR tradicional con Tesseract.js (sin IA): devuelve OcrResult con los campos
 * que haya podido extraer (los no encontrados quedan en null y se corrigen en
 * la vista previa).
 */

export const maxDuration = 60

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
      ? mimeRaw
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

    const texto = await extraerTextoImagen(`data:${mime};base64,${base64Data}`)
    const result = parseTextoTicket(texto, 'gasto')

    return NextResponse.json(result)
  } catch (error) {
    console.error('OCR image error:', error)
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    )
  }
}
