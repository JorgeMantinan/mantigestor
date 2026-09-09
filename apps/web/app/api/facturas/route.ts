import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { FacturaSchema } from '@mantigestor/utils'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { registrarAccion } from '@/lib/audit-log'

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

    const supabase = createServerClient(
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

    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)

    let query = supabase
      .from('facturas')
      .select('*', { count: 'exact' })
      .eq('perfilId', perfilId)
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (tipo === 'ingreso' || tipo === 'gasto') {
      query = query.eq('tipo', tipo)
    }

    const { data, error, count } = await query

    if (error) throw error

    return Response.json({
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
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

    const { perfilId } = await resolvePerfilActivo(req)

    const supabase = createServerClient(
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

    const body = await req.json()
    const parsed = FacturaSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const { data, error } = await supabase.from('facturas').insert({
      id: crypto.randomUUID(),
      perfilId,
      ...parsed.data,
      fechaEmision: parsed.data.fechaEmision.toISOString(),
      createdAt: new Date().toISOString(),
    }).select().single()

    if (error) throw error

    await registrarAccion(req, perfilId, 'factura', data.id, 'crear', {
      numero: data.numero,
      tipo: data.tipo,
      emisorReceptor: data.emisorReceptor,
    })

    return Response.json({ data }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
