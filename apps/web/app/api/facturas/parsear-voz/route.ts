import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'
import { parsearVozAFactura } from '@/lib/voz'

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { texto } = await req.json()
    if (!texto || typeof texto !== 'string') {
      return badRequest('texto requerido')
    }

    if (texto.length > 2000) {
      return badRequest('Texto demasiado largo (máximo 2000 caracteres)')
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API de IA no configurada' }, { status: 503 })
    }

    // Gate PRO: la transcripción de voz a factura usa IA (regla del producto)
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
    const { data: sub } = await supabase
      .from('suscripciones')
      .select('tier, estado')
      .eq('perfilId', perfilId)
      .in('estado', ['active', 'trialing'])
      .order('currentPeriodStart', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!sub || sub.tier !== 'PRO') {
      return NextResponse.json(
        { error: 'La creación de facturas por voz requiere Plan Pro', requierePro: true },
        { status: 403 }
      )
    }

    const result = await parsearVozAFactura(texto)
    return NextResponse.json(result)
  } catch (error) {
    return serverError(error)
  }
}
