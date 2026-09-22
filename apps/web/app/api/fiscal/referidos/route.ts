import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, serverError, badRequest } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { getReferralStats, createReferral } from '@/lib/referral'

export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const stats = await getReferralStats(req, user.id)
    return Response.json(stats)
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body: unknown = await req.json()
    const { email, nombre } = body as { email?: string; nombre?: string }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return badRequest('Email inválido')
    }

    const resultado = await createReferral(req, user.id, user.email ?? '', email, nombre)
    return Response.json(resultado)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al procesar invitación'
    return badRequest(mensaje)
  }
}
