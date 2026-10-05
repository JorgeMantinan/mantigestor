import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { extractInvoiceData, esUrlStorageSegura } from '@/lib/ocr'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { firmarUrlAdmin, carpetaDeUrlStorage } from '@/lib/storage-server'
import { z } from 'zod'

const OcrBodySchema = z.object({
  pdfUrl: z.string().min(1, 'pdfUrl requerido'),
})

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 20, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const parsed = OcrBodySchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.flatten().fieldErrors)
    }

    const { pdfUrl } = parsed.data

    if (!esUrlStorageSegura(pdfUrl)) {
      return badRequest('URL de documento no permitida')
    }

    // El documento debe vivir en la carpeta del perfil activo (bucket privado)
    const { perfilId } = await resolvePerfilActivo(req)
    if (carpetaDeUrlStorage(pdfUrl) !== perfilId) {
      return badRequest('URL de documento no permitida')
    }

    const result = await extractInvoiceData(await firmarUrlAdmin(pdfUrl))
    return NextResponse.json(result)
  } catch (error) {
    return serverError(error)
  }
}
