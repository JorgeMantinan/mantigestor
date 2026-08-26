import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { parsearVozAFactura } from '@/lib/voz'

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { texto } = await req.json()
    if (!texto || typeof texto !== 'string') {
      return badRequest('texto requerido')
    }

    if (texto.length > 2000) {
      return badRequest('Texto demasiado largo (máximo 2000 caracteres)')
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API de IA no configurada' }, { status: 503 })
    }

    const result = await parsearVozAFactura(texto)
    return NextResponse.json(result)
  } catch (error) {
    return serverError(error)
  }
}
