import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { FacturaSchema } from '@mantigestor/utils'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo, esSoloLectura } from '@/lib/resolve-perfil-activo'
import { registrarAccion } from '@/lib/audit-log'
import { regenerarModelosDeFecha } from '@/lib/fiscal/modelos-generados'

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
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))

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

    const { perfilId, rol } = await resolvePerfilActivo(req)
    // Escritura bloqueada para perfiles en modo solo lectura (visualizador)
    if (esSoloLectura(rol)) {
      return NextResponse.json({ error: 'El perfil está en modo solo lectura' }, { status: 403 })
    }

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

    const datosInsert = {
      id: crypto.randomUUID(),
      perfilId,
      ...parsed.data,
      fechaEmision: parsed.data.fechaEmision.toISOString(),
      createdAt: new Date().toISOString(),
    }

    // Reintento ante23505 (UNIQUE perfilId+numero): si otro cliente/cron se
    // coló con el mismo número, se pide el siguiente al servidor y reintenta
    let data: { id: string; numero: string; tipo: string; emisorReceptor: string; fechaEmision: string } | null = null
    let error: { code?: string } | null = null
    let numero = String(parsed.data.numero)
    for (let intento = 0; intento < 3; intento++) {
      const res = await supabase
        .from('facturas')
        .insert({ ...datosInsert, numero })
        .select()
        .single()
      data = res.data
      error = res.error
      if (!error) break
      if (error.code !== '23505') break
      const prefijo = numero.replace(/\d+$/, '').replace(/[\\%_]/g, '\\$&')
      const { data: ultima } = await supabase
        .from('facturas')
        .select('numero')
        .eq('perfilId', perfilId)
        .like('numero', `${prefijo}%`)
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle()
      const maximo = parseInt(String(ultima?.numero ?? '').replace(prefijo, ''), 10) || 0
      numero = `${prefijo}${String(maximo + 1).padStart(3, '0')}`
      datosInsert.id = crypto.randomUUID()
    }

    if (error || !data) throw error

    await registrarAccion(req, perfilId, 'factura', data.id, 'crear', {
      numero: data.numero,
      tipo: data.tipo,
      emisorReceptor: data.emisorReceptor,
    })

    // Regenerar los modelos fiscales del periodo afectado por la nueva factura
    await regenerarModelosDeFecha(supabase, perfilId, String(data.fechaEmision))

    return Response.json({ data }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
