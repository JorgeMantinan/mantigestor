import { NextResponse, type NextRequest } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { getAuthenticatedUser } from '@/lib/api-helpers'
import { swaggerSpec } from '@/lib/openapi'

// El spec vive en lib/openapi.ts (generado del código real de app/api/**).
// Si se añade una ruta nueva, hay que añadirla allí (hay test que lo comprueba).
// Autenticación: el inventario completo de rutas + mecanismos de auth no debe
// ser de dominio público (el Swagger UI del dashboard manda las cookies).
export async function GET(req: NextRequest) {
  const { success } = await rateLimitByIp(req)
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
  }
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return NextResponse.json(swaggerSpec)
}
