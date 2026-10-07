import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

function compararSecretos(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Autenticación de rutas cron (Vercel Cron).
 *
 * - Acepta `Authorization: Bearer <CRON_SECRET>` o el header `x-cron-secret`.
 * - Si CRON_SECRET no está definida, DENIEGA (antes la comparación contra el
 *   literal "Bearer undefined" dejaba pasar a cualquiera).
 * - Comparación timing-safe.
 */
export function verificarCron(req: NextRequest): boolean {
  // normaliza comillas: dotenv local y Vercel guardan el secreto con distintas
  // comillas ("abc" vs abc) — sin esto, la verificación manual da 401
  const normalizar = (s: string) => s.trim().replace(/^"(.*)"$/, '$1')

  const secret = process.env.CRON_SECRET ? normalizar(process.env.CRON_SECRET) : undefined
  if (!secret) return false

  const authHeader = req.headers.get('authorization')
  const headerSecreto = req.headers.get('x-cron-secret')

  let candidato: string | null = null
  if (authHeader?.startsWith('Bearer ')) {
    candidato = authHeader.slice('Bearer '.length)
  } else if (headerSecreto) {
    candidato = headerSecreto
  }

  if (!candidato) return false
  return compararSecretos(normalizar(candidato), secret)
}
