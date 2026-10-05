import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, serverError, badRequest } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { createServerClient } from '@supabase/ssr'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { z } from 'zod'

export interface PreferenciaNotificacion {
  id: string
  perfilId: string
  canal: 'in_app' | 'email'
  categoria: string
  diasAntelacion: number
  activo: boolean
}

const PreferenciasSchema = z.object({
  preferencias: z
    .array(
      z.object({
        canal: z.enum(['in_app', 'email']),
        categoria: z.string().min(1).max(50),
        diasAntelacion: z.number().int().min(1).max(30),
        activo: z.boolean(),
      })
    )
    .max(50),
})

function getSupabase(req: NextRequest) {
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
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const supabase = getSupabase(req)

    const { data, error } = await supabase
      .from('preferencias_notificaciones')
      .select('*')
      .eq('perfilId', perfilId)
      .order('categoria')

    if (error) return serverError(error)

    return NextResponse.json({ preferencias: data ?? [] })
  } catch (error) {
    return serverError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 30, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { perfilId } = await resolvePerfilActivo(req)

    const body = await req.json().catch(() => null)
    const parsed = PreferenciasSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.flatten().fieldErrors)
    }

    const supabase = getSupabase(req)

    // Validadas por Zod (tipos, rangos y máximo de entradas)
    const limpias = parsed.data.preferencias

    // Eliminar existentes y reinsertar
    await supabase
      .from('preferencias_notificaciones')
      .delete()
      .eq('perfilId', perfilId)

    if (limpias.length > 0) {
      const inserts = limpias.map(p => ({
        id: crypto.randomUUID(),
        perfilId,
        canal: p.canal,
        categoria: p.categoria,
        diasAntelacion: p.diasAntelacion,
        activo: p.activo,
      }))

      const { error } = await supabase
        .from('preferencias_notificaciones')
        .insert(inserts)

      if (error) return serverError(error)
    }

    return NextResponse.json({ ok: true, count: limpias.length })
  } catch (error) {
    return serverError(error)
  }
}
