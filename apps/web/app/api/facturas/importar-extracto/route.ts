import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { parsearExtracto, type FormatoExtracto } from '@mantigestor/utils'

const FORMATOS_VALIDOS: FormatoExtracto[] = [
  'csv_santander', 'csv_bbva', 'csv_caixabank', 'csv_sabadell', 'csv_bankia', 'generico'
]

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const { csv, formato } = body as { csv: string; formato: string }

    if (!csv || typeof csv !== 'string') {
      return badRequest('csv requerido (texto del extracto)')
    }

    if (!formato || !FORMATOS_VALIDOS.includes(formato as FormatoExtracto)) {
      return badRequest(`formato inválido. Opciones: ${FORMATOS_VALIDOS.join(', ')}`)
    }

    if (csv.length > 500_000) {
      return badRequest('El archivo es demasiado grande (máx 500KB)')
    }

    const movimientos = parsearExtracto(csv, formato as FormatoExtracto)

    // Clasificar cada movimiento como ingreso o gasto
    const clasificados = movimientos.map(m => ({
      fecha: m.fecha.toISOString().slice(0, 10),
      concepto: m.concepto,
      importe: m.importe,
      tipo: m.importe >= 0 ? 'ingreso' as const : 'gasto' as const,
      saldo: m.saldo,
      referencia: m.referencia,
    }))

    return NextResponse.json({
      movimientos: clasificados,
      total: clasificados.length,
      ingresos: clasificados.filter(m => m.tipo === 'ingreso').length,
      gastos: clasificados.filter(m => m.tipo === 'gasto').length,
    })
  } catch (error) {
    return serverError(error)
  }
}
