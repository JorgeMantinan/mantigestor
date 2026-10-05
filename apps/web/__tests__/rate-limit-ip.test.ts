import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

function crearRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/test', { headers })
}

describe('rateLimitByIp', () => {
  beforeEach(() => {
    // IPs únicas por test para no contaminar el Map en memoria del módulo
  })

  it('la primera petición de una IP pasa y la segunda agota la cuota', async () => {
    const req = crearRequest({ 'x-real-ip': '203.0.113.10' })
    const a = await rateLimitByIp(req, { maxRequests: 1, windowMs: 60_000 })
    const b = await rateLimitByIp(req, { maxRequests: 1, windowMs: 60_000 })
    expect(a.success).toBe(true)
    expect(b.success).toBe(false)
  })

  it('IPs distintas tienen cuotas independientes', async () => {
    const a = await rateLimitByIp(crearRequest({ 'x-real-ip': '203.0.113.11' }), { maxRequests: 1, windowMs: 60_000 })
    const b = await rateLimitByIp(crearRequest({ 'x-real-ip': '203.0.113.12' }), { maxRequests: 1, windowMs: 60_000 })
    expect(a.success).toBe(true)
    expect(b.success).toBe(true)
  })

  it('usa el ÚLTIMO salto de x-forwarded-for (el primero lo escribe el cliente)', async () => {
    // Mismo salto final → misma cuota aunque el cliente cambie el primer valor
    const r1 = await rateLimitByIp(
      crearRequest({ 'x-forwarded-for': '198.51.100.1, 203.0.113.99' }),
      { maxRequests: 1, windowMs: 60_000 }
    )
    const r2 = await rateLimitByIp(
      crearRequest({ 'x-forwarded-for': '198.51.100.2, 203.0.113.99' }),
      { maxRequests: 1, windowMs: 60_000 }
    )
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(false)

    // Salto final distinto → otra cuota → no afecta
    const r3 = await rateLimitByIp(
      crearRequest({ 'x-forwarded-for': '198.51.100.1, 203.0.113.98' }),
      { maxRequests: 1, windowMs: 60_000 }
    )
    expect(r3.success).toBe(true)
  })

  it('prefiere x-real-ip cuando no hay x-forwarded-for', async () => {
    const a = await rateLimitByIp(crearRequest({ 'x-real-ip': '203.0.113.50' }), { maxRequests: 1, windowMs: 60_000 })
    const b = await rateLimitByIp(crearRequest({ 'x-real-ip': '203.0.113.50' }), { maxRequests: 1, windowMs: 60_000 })
    expect(a.success).toBe(true)
    expect(b.success).toBe(false)
  })
})
