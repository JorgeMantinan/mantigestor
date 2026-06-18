import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { extractInvoiceData } from '@/lib/ocr'

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 20, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { pdfUrl } = await req.json()
    if (!pdfUrl || typeof pdfUrl !== 'string') {
      return badRequest('pdfUrl requerido')
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API de IA no configurada' }, { status: 503 })
    }

    const result = await extractInvoiceData(pdfUrl)
    return NextResponse.json(result)
  } catch (error) {
    return serverError(error)
  }
}
