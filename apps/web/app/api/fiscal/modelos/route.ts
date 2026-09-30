import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { createServerClient } from '@supabase/ssr'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { ModelosPeriodoSchema } from '@mantigestor/utils'
import { listarModelosPeriodo, regenerarModelosPeriodo } from '@/lib/fiscal/modelos-generados'
import type { Trimestre } from '@/lib/fiscal/generador-modelos'

function clienteServer(req: NextRequest) {
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

function periodoDesdeParams(params: Record<string, string> | URLSearchParams) {
  const get = (clave: string) => {
    if (params instanceof URLSearchParams) return params.get(clave)
    return params[clave]
  }
  return {
    anyo: Number(get('anyo')),
    trimestre: Number(get('trimestre')),
  }
}

/** Lista los modelos fiscales almacenados de un periodo */
export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const parsed = ModelosPeriodoSchema.safeParse(periodoDesdeParams(req.nextUrl.searchParams))
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const { perfilId } = await resolvePerfilActivo(req)
    const supabase = clienteServer(req)

    const modelos = await listarModelosPeriodo(supabase, perfilId, parsed.data.anyo, parsed.data.trimestre as Trimestre)

    return NextResponse.json({
      modelos,
      anyo: parsed.data.anyo,
      trimestre: parsed.data.trimestre,
    })
  } catch (error) {
    return serverError(error)
  }
}

/**
 * Regenera los modelos del periodo desde los datos reales de la BD:
 * borra los anteriores y guarda los nuevos (o devuelve los existentes si
 * las huellas no han cambiado).
 */
export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const parsed = ModelosPeriodoSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const { perfilId, error } = await resolvePerfilActivo(req)
    if (error) return badRequest({ perfil: [error] })

    const supabase = clienteServer(req)
    const { modelos, regenerado } = await regenerarModelosPeriodo(
      supabase,
      perfilId,
      parsed.data.anyo,
      parsed.data.trimestre as Trimestre
    )

    return NextResponse.json({ modelos, regenerado, anyo: parsed.data.anyo, trimestre: parsed.data.trimestre })
  } catch (err) {
    return serverError(err)
  }
}
