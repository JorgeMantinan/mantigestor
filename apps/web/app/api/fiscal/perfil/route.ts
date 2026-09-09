import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { getAuthenticatedUser, unauthorized, serverError, badRequest } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

const PerfilFiscalSchema = z.object({
  comunidadFiscal: z.string().max(80).nullable().optional(),
  perfilFiscal: z.enum(['autonomo', 'sociedad', 'empleado', 'alquilador']).nullable().optional(),
  empresas: z.string().max(10000).nullable().optional(),
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
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const supabase = supabaseDeReq(req)
    let fila: Record<string, unknown> | null = null
    const porUserId = await supabase
      .from('perfiles')
      .select('comunidadFiscal, perfilFiscal, empresas')
      .eq('userId', user.id)
      .maybeSingle()
    fila = porUserId.data
    if (!fila) {
      // compatibilidad con filas antiguas creadas con id = userId
      const porId = await supabase
        .from('perfiles')
        .select('comunidadFiscal, perfilFiscal, empresas')
        .eq('id', user.id)
        .maybeSingle()
      fila = porId.data
    }

    return Response.json({
      data: {
        comunidadFiscal: fila?.comunidadFiscal ?? null,
        perfilFiscal:
          typeof fila?.perfilFiscal === 'string' &&
          ['autonomo', 'sociedad', 'empleado', 'alquilador'].includes(fila.perfilFiscal)
            ? (fila.perfilFiscal as 'autonomo' | 'sociedad' | 'empleado' | 'alquilador')
            : null,
        empresas: fila?.empresas ?? null,
      },
    })
  } catch (error) {
    return serverError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }, { status: 429 })
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body: unknown = await req.json()
    const parsed = PerfilFiscalSchema.safeParse(body)
    if (!parsed.success) return badRequest('Datos de perfil fiscal inválidos')

    const { perfilId } = await resolvePerfilActivo(req)

    const supabase = supabaseDeReq(req)
    // Comprobar si existe la fila del usuario para decidir insert vs update (id distinto según el origen)
    const existentePorUserId = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .maybeSingle()
    const existente = existentePorUserId.data ?? (
      await supabase.from('perfiles').select('id').eq('id', user.id).maybeSingle()
    ).data

    if (existente) {
      const { error } = await supabase
        .from('perfiles')
        .update({ ...parsed.data, updatedAt: new Date().toISOString() })
        .eq('id', String(existente.id))
      if (error) throw new Error('No se pudo guardar el perfil fiscal')
    } else {
      // Convención RLS de la tabla perfiles: la fila del usuario lleva id = userId
      const ahora = new Date().toISOString()
      const { error } = await supabase
        .from('perfiles')
        .insert({
          id: perfilId,
          userId: user.id,
          email: user.email ?? '',
          createdAt: ahora,
          updatedAt: ahora,
          ...parsed.data,
        })
      if (error) throw new Error('No se pudo crear el perfil fiscal')
    }

    return Response.json({ data: parsed.data })
  } catch (error) {
    return serverError(error)
  }
}
