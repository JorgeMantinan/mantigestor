import { NextResponse } from 'next/server'
import { swaggerSpec } from '@/lib/openapi'

// El spec vive en lib/openapi.ts (generado del código real de app/api/**).
// Si se añade una ruta nueva, hay que añadirla allí (hay un test que lo comprueba).
export async function GET() {
  return NextResponse.json(swaggerSpec)
}
