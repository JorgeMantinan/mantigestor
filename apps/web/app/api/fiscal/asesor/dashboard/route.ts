import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

export interface PersonaDashboard {
  perfilId: string
  nombre: string | null
  email: string
  nif: string | null
  suscripcionTier: string | null
  proximoVencimiento: string | null
  proximoVencimientoNombre: string | null
  modelosPendientes: string[]
  facturasPendientes: number
  facturasVencidas: number
  ultimaActividad: string | null
  ingresosMes: number
  gastosMes: number
}

export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

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

    // Obtener asociaciones donde soy gestor (yo gestiono a otros)
    const { data: asociaciones } = await supabase
      .from('perfil_asociado')
      .select('perfilId, rol')
      .eq('ownerUserId', user.id)

    if (!asociaciones || asociaciones.length === 0) {
      return NextResponse.json({ personas: [] })
    }

    const ids = asociaciones.map(a => a.perfilId)

    // Obtener perfiles asociados
    const { data: perfilesFn } = await supabase
      .rpc('obtener_perfiles_por_ids', { p_ids: ids })

    let perfiles = perfilesFn
    if (!perfilesFn || perfilesFn.length === 0) {
      const { data: perfilesDirect } = await supabase
        .from('perfiles')
        .select('id, nombre, email, nif')
        .in('id', ids)
      perfiles = perfilesDirect
    }

    if (!perfiles || perfiles.length === 0) {
      return NextResponse.json({ personas: [] })
    }

    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

    const personas: PersonaDashboard[] = []

    for (const perfil of perfiles) {
      const perfilId = perfil.id

      // Suscripción
      const { data: sub } = await supabase
        .from('suscripciones')
        .select('tier')
        .eq('perfilId', perfilId)
        .in('estado', ['active', 'trialing'])
        .order('currentPeriodStart', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Facturas del mes actual
      const { data: facturasMes } = await supabase
        .from('facturas')
        .select('tipo, total, estado, fechaVencimiento, fechaEmision')
        .eq('perfilId', perfilId)
        .gte('fechaEmision', inicioMes)

      let facturasPendientes = 0
      let facturasVencidas = 0
      let ingresosMes = 0
      let gastosMes = 0

      if (facturasMes) {
        facturasPendientes = facturasMes.filter(f => f.estado === 'pendiente').length
        facturasVencidas = facturasMes.filter(f => f.estado === 'vencida').length
        ingresosMes = facturasMes.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
        gastosMes = facturasMes.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)
      }

      // Próximo vencimiento de facturas
      const { data: proximaFactura } = await supabase
        .from('facturas')
        .select('fechaVencimiento')
        .eq('perfilId', perfilId)
        .eq('estado', 'pendiente')
        .not('fechaVencimiento', 'is', null)
        .gte('fechaVencimiento', hoy.toISOString())
        .order('fechaVencimiento', { ascending: true })
        .limit(1)
        .maybeSingle()

      // Modelos pendientes basados en la fecha
      const modelosPendientes: string[] = []
      const mesActual = hoy.getMonth() + 1

      // 303 IVA trimestral
      if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
        modelosPendientes.push('303')
      }
      // 130 pago fraccionado trimestral
      if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
        modelosPendientes.push('130')
      }
      // 111 retenciones trimestral
      if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
        modelosPendientes.push('111')
      }
      // 115 retenciones inmuebles trimestral
      if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
        modelosPendientes.push('115')
      }
      // 349 operaciones intracomunitarias mensual
      if (hoy.getDate() <= 20) {
        modelosPendientes.push('349')
      }
      // 190 retenciones anual (enero)
      if (mesActual === 1 && hoy.getDate() <= 31) {
        modelosPendientes.push('190')
      }

      // Última actividad (última factura)
      const { data: ultimaFactura } = await supabase
        .from('facturas')
        .select('createdAt')
        .eq('perfilId', perfilId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle()

      personas.push({
        perfilId,
        nombre: perfil.nombre,
        email: perfil.email,
        nif: perfil.nif ?? null,
        suscripcionTier: sub?.tier ?? null,
        proximoVencimiento: proximaFactura?.fechaVencimiento ?? null,
        proximoVencimientoNombre: 'Factura',
        modelosPendientes,
        facturasPendientes,
        facturasVencidas,
        ultimaActividad: ultimaFactura?.createdAt ?? null,
        ingresosMes,
        gastosMes,
      })
    }

    return NextResponse.json({ personas })
  } catch (error) {
    return serverError(error)
  }
}
