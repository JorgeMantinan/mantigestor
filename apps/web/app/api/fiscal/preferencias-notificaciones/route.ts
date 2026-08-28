import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { createServerClient } from '@supabase/ssr'

export interface PreferenciaNotificacion {
  id: string
  perfilId: string
  canal: 'in_app' | 'email'
  categoria: string
  diasAntelacion: number
  activo: boolean
}

const CATEGORIAS = ['iva', 'irpf', 'retenciones', 'renta', 'todos'] as const
const CANALES = ['in_app', 'email'] as const

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
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const supabase = getSupabase(req)

    const { data, error } = await supabase
      .from('preferencias_notificaciones')
      .select('*')
      .eq('perfilId', user.id)
      .order('categoria')

    if (error) return serverError(error)

    return NextResponse.json({ preferencias: data ?? [] })
  } catch (error) {
    return serverError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req, { maxRequests: 30, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const body = await req.json()
    const { preferencias } = body as {
      preferencias: Array<{
        canal: string
        categoria: string
        diasAntelacion: number
        activo: boolean
      }>
    }

    if (!Array.isArray(preferencias)) {
      return NextResponse.json({ error: 'preferencias debe ser un array' }, { status: 400 })
    }

    const supabase = getSupabase(req)

    // Validar y limpiar
    const limpias = preferencias.filter(p =>
      CANALES.includes(p.canal as typeof CANALES[number]) &&
      CATEGORIAS.includes(p.categoria as typeof CATEGORIAS[number]) &&
      typeof p.diasAntelacion === 'number' &&
      p.diasAntelacion >= 1 &&
      p.diasAntelacion <= 30 &&
      typeof p.activo === 'boolean'
    )

    // Eliminar existentes y reinsertar
    await supabase
      .from('preferencias_notificaciones')
      .delete()
      .eq('perfilId', user.id)

    if (limpias.length > 0) {
      const inserts = limpias.map(p => ({
        id: crypto.randomUUID(),
        perfilId: user.id,
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
