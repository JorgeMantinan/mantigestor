import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, getSupabaseServer, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

export async function GET(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const supabase = await getSupabaseServer(req)
    const { data, error } = await supabase
      .from('facturas_recurrentes')
      .select('*')
      .eq('perfilId', perfilId)
      .order('createdAt', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 20, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const body = await req.json()
    const { tipo, numero, emisorReceptor, nifContraparte, baseImponible, iva, diaGeneracion, diaEmail, notas } = body

    if (!tipo || !numero || !emisorReceptor || baseImponible == null || !diaGeneracion) {
      return badRequest('Faltan campos obligatorios')
    }

    if (![21, 10, 4, 0].includes(iva)) {
      return badRequest('IVA debe ser 0, 4, 10 o 21')
    }

    if (diaGeneracion < 1 || diaGeneracion > 28) {
      return badRequest('Día de generación debe ser entre 1 y 28')
    }

    if (diaEmail != null && (diaEmail < 1 || diaEmail > 28)) {
      return badRequest('Día de email debe ser entre 1 y 28 o null')
    }

    if (notas != null && typeof notas !== 'string') {
      return badRequest('notas debe ser una cadena JSON')
    }

    const id = crypto.randomUUID()
    const supabase = await getSupabaseServer(req)
    const { data, error } = await supabase
      .from('facturas_recurrentes')
      .insert({
        id,
        perfilId,
        tipo,
        numero,
        emisorReceptor,
        nifContraparte: nifContraparte || null,
        baseImponible: Math.round(baseImponible * 100),
        iva,
        diaGeneracion,
        diaEmail: diaEmail ?? null,
        activa: true,
        notas: notas ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
