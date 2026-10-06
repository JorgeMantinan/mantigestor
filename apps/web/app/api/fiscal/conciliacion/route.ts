import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo, esSoloLectura } from '@/lib/resolve-perfil-activo'

const MovimientoSchema = z.object({
  fecha: z.string(),
  concepto: z.string().min(1),
  importe: z.number(),
  saldo: z.number(),
  referencia: z.string().nullable().optional(),
  categoria: z.enum(['ingreso', 'gasto', 'transferencia']).nullable().optional(),
})

const SaveMovimientosSchema = z.object({
  movimientos: z.array(MovimientoSchema).min(1).max(500),
})

function supabaseDeReq(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )
}

export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)
    const supabase = supabaseDeReq(req)

    const { searchParams } = new URL(req.url)
    const conciliado = searchParams.get('conciliado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    let query = supabase
      .from('movimientos_banco')
      .select('*', { count: 'exact' })
      .eq('perfilId', perfilId)
      .order('fecha', { ascending: false })

    if (conciliado === 'true') {
      query = query.eq('conciliado', true)
    } else if (conciliado === 'false') {
      query = query.eq('conciliado', false)
    }

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde)
    }
    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta)
    }

    const { data, error, count } = await query

    if (error) throw error

    return Response.json({
      data,
      total: count ?? 0,
    })
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId, rol } = await resolvePerfilActivo(req)
    // Escritura bloqueada para perfiles en modo solo lectura (visualizador)
    if (esSoloLectura(rol)) {
      return NextResponse.json({ error: 'El perfil está en modo solo lectura' }, { status: 403 })
    }

    const body: unknown = await req.json()
    const parsed = SaveMovimientosSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const supabase = supabaseDeReq(req)

    const movimientos = parsed.data.movimientos.map((m) => ({
      id: crypto.randomUUID(),
      perfilId,
      fecha: new Date(m.fecha).toISOString(),
      concepto: m.concepto,
      importe: Math.round(m.importe * 100),
      saldo: Math.round(m.saldo * 100),
      referencia: m.referencia ?? null,
      categoria: m.categoria ?? null,
      conciliado: false,
      createdAt: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('movimientos_banco')
      .insert(movimientos)
      .select()

    if (error) throw error

    return Response.json({ data }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
