import { NextResponse, type NextRequest } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { swaggerSpec } from '@/lib/openapi'

// El spec vive en lib/openapi.ts (generado del código real de app/api/**).
// Si se añade una ruta nueva, hay que añadirla allí (hay test que lo comprueba).
export async function GET(req: NextRequest) {
  const { success } = await rateLimitByIp(req)
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
  }
  return NextResponse.json(swaggerSpec)
}
