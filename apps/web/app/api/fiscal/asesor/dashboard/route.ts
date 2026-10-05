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

    // Modelos pendientes según la fecha (mismo criterio para todos los perfiles)
    const modelosPendientes: string[] = []
    const mesActual = hoy.getMonth() + 1
    if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
      modelosPendientes.push('303', '130', '111', '115')
    }
    if (hoy.getDate() <= 20) {
      modelosPendientes.push('349')
    }
    if (mesActual === 1) {
      modelosPendientes.push('190')
    }

    // 4 consultas EN LOTE para todos los perfiles (antes eran 4 por persona:
    // con 25 clientes eran 100 round-trips secuenciales).
    const [subsRes, facturasMesRes, proximasRes, ultimasRes] = await Promise.all([
      supabase
        .from('suscripciones')
        .select('perfilId, tier, currentPeriodStart')
        .in('perfilId', ids)
        .in('estado', ['active', 'trialing'])
        .order('currentPeriodStart', { ascending: false }),
      supabase
        .from('facturas')
        .select('perfilId, tipo, total, estado, fechaVencimiento, fechaEmision')
        .in('perfilId', ids)
        .gte('fechaEmision', inicioMes),
      supabase
        .from('facturas')
        .select('perfilId, fechaVencimiento')
        .in('perfilId', ids)
        .eq('estado', 'pendiente')
        .not('fechaVencimiento', 'is', null)
        .gte('fechaVencimiento', hoy.toISOString())
        .order('fechaVencimiento', { ascending: true }),
      supabase
        .from('facturas')
        .select('perfilId, createdAt')
        .in('perfilId', ids)
        .order('createdAt', { ascending: false })
        .limit(2000),
    ])

    // Suscripción más reciente por perfil
    const subPorPerfil = new Map<string, string>()
    for (const s of subsRes.data ?? []) {
      if (!subPorPerfil.has(s.perfilId)) subPorPerfil.set(s.perfilId, s.tier)
    }

    // Próximo vencimiento por perfil (la consulta ya viene ordenada asc)
    const proximoPorPerfil = new Map<string, string>()
    for (const f of proximasRes.data ?? []) {
      if (f.fechaVencimiento && !proximoPorPerfil.has(f.perfilId)) {
        proximoPorPerfil.set(f.perfilId, f.fechaVencimiento)
      }
    }

    // Última factura por perfil (orden desc → la primera que aparece)
    const ultimaPorPerfil = new Map<string, string>()
    for (const f of ultimasRes.data ?? []) {
      if (!ultimaPorPerfil.has(f.perfilId)) ultimaPorPerfil.set(f.perfilId, f.createdAt)
    }

    // Totales del mes por perfil
    const totalesPorPerfil = new Map<string, { pendientes: number; vencidas: number; ingresos: number; gastos: number }>()
    for (const f of facturasMesRes.data ?? []) {
      let t = totalesPorPerfil.get(f.perfilId)
      if (!t) {
        t = { pendientes: 0, vencidas: 0, ingresos: 0, gastos: 0 }
        totalesPorPerfil.set(f.perfilId, t)
      }
      if (f.estado === 'pendiente') t.pendientes++
      if (f.estado === 'vencida') t.vencidas++
      if (f.tipo === 'ingreso') t.ingresos += f.total
      if (f.tipo === 'gasto') t.gastos += f.total
    }

    const personas: PersonaDashboard[] = []
    for (const perfil of perfiles) {
      const t = totalesPorPerfil.get(perfil.id)
      personas.push({
        perfilId: perfil.id,
        nombre: perfil.nombre,
        email: perfil.email,
        nif: perfil.nif ?? null,
        suscripcionTier: subPorPerfil.get(perfil.id) ?? null,
        proximoVencimiento: proximoPorPerfil.get(perfil.id) ?? null,
        proximoVencimientoNombre: 'Factura',
        modelosPendientes,
        facturasPendientes: t?.pendientes ?? 0,
        facturasVencidas: t?.vencidas ?? 0,
        ultimaActividad: ultimaPorPerfil.get(perfil.id) ?? null,
        ingresosMes: t?.ingresos ?? 0,
        gastosMes: t?.gastos ?? 0,
      })
    }

    return NextResponse.json({ personas })
  } catch (error) {
    return serverError(error)
  }
}
