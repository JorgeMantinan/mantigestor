import { rateLimit, type RateLimitConfig } from './rate-limit'
import type { NextRequest } from 'next/server'

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000,
}

/**
 * Rate limiting por IP.
 *
 * Orden de obtención de la IP:
 * 1. `req.ip` — en Vercel lo asigna la plataforma (no manipulable por el cliente).
 * 2. Último salto de `x-forwarded-for` — el primero lo escribe el cliente y
 *    algunos proxies lo concatenan, así que el primer valor es falsificable.
 * 3. `x-real-ip` como último recurso.
 */
export async function rateLimitByIp(
  req: Request,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ success: boolean; remaining: number }> {
  let ip: string | undefined

  const nextReq = req as NextRequest
  if (typeof nextReq.ip === 'string' && nextReq.ip) {
    ip = nextReq.ip
  }

  if (!ip) {
    const xff = req.headers.get('x-forwarded-for')
    if (xff) {
      const saltos = xff.split(',').map(s => s.trim()).filter(Boolean)
      const ultimo = saltos[saltos.length - 1]
      if (ultimo) ip = ultimo
    }
  }

  if (!ip) {
    ip = req.headers.get('x-real-ip') ?? undefined
  }

  // Clave por ruta Y por configuración: antes TODAS las rutas compartían un
  // único contador por IP, así que los límites "por ruta" no existían de facto
  // (30 llamadas agotaban la cuota global e impactaban a Stripe/demo/etc).
  let ruta = 'global'
  try {
    ruta = new URL(req.url).pathname
  } catch {
    // URL no parseable: mantener la clave 'global'
  }

  return rateLimit(`ip:${ip ?? 'unknown'}:${ruta}:${config.maxRequests}:${config.windowMs}`, config)
}
