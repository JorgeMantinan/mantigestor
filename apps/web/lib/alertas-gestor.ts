import { createClient } from '@/lib/supabase/client'
import { getCalendarioFiscal } from '@mantigestor/utils'

export type PrioridadAlerta = 'alta' | 'media' | 'baja'

export interface AlertaGestor {
  id: string
  perfilId: string
  nombreCliente: string
  tipo: string
  titulo: string
  descripcion: string
  prioridad: PrioridadAlerta
  modeloRelacionado?: string
  fechaCreacion: string
  resuelta: boolean
}

interface DatosCliente {
  perfilId: string
  nombre: string | null
  email: string
}

export async function generarAlertasGestor(): Promise<AlertaGestor[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Obtener personas gestionadas
  const { data: asociaciones } = await supabase
    .from('perfil_asociado')
    .select('perfilId')
    .eq('ownerUserId', user.id)

  if (!asociaciones || asociaciones.length === 0) return []

  const ids = asociaciones.map(a => a.perfilId)

  // Obtener perfiles
  const { data: perfilesFn } = await supabase
    .rpc('obtener_perfiles_por_ids', { p_ids: ids })

  let perfiles = perfilesFn
  if (!perfilesFn || perfilesFn.length === 0) {
    const { data: perfilesDirect } = await supabase
      .from('perfiles')
      .select('id, nombre, email')
      .in('id', ids)
    perfiles = perfilesDirect
  }

  if (!perfiles || perfiles.length === 0) return []

  const alertas: AlertaGestor[] = []
  const hoy = new Date()
  const anioActual = hoy.getFullYear()
  const calendario = getCalendarioFiscal(anioActual)
  const mesActual = hoy.getMonth() + 1

  // Modelos pendientes: criterio por fecha (mismo criterio para todos los perfiles)
  const plazosHoy = calendario.filter(p => {
    const diff = Math.ceil((p.fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 30
  })
  const modelosPendientes: Array<{
    clave: string
    titulo: string
    descripcion: string
    prioridad: PrioridadAlerta
  }> = []
  if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
    const plazo303 = plazosHoy.find(p => p.descripcion.includes('303'))
    if (plazo303) {
      modelosPendientes.push({
        clave: '303',
        titulo: 'Modelo 303 sin presentar',
        descripcion: `El plazo para el Modelo 303 (IVA trimestral) vence el ${plazo303.fechaLimite.toLocaleDateString('es-ES')}.`,
        prioridad: 'alta',
      })
    }
    const plazo130 = plazosHoy.find(p => p.descripcion.includes('130'))
    if (plazo130) {
      modelosPendientes.push({
        clave: '130',
        titulo: 'Modelo 130 sin presentar',
        descripcion: `El plazo para el Modelo 130 (pago fraccionado) vence el ${plazo130.fechaLimite.toLocaleDateString('es-ES')}.`,
        prioridad: 'alta',
      })
    }
    const plazo111 = plazosHoy.find(p => p.descripcion.includes('111'))
    if (plazo111) {
      modelosPendientes.push({
        clave: '111',
        titulo: 'Modelo 111 sin presentar',
        descripcion: `El plazo para el Modelo 111 (retenciones) vence el ${plazo111.fechaLimite.toLocaleDateString('es-ES')}.`,
        prioridad: 'media',
      })
    }
  }

  // 3 consultas EN LOTE para todos los perfiles (antes 4-5 por perfil:
  // con 25 clientes eran 100+ peticiones secuenciales desde el navegador).
  const en15Dias = new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
  const trimestreActual = Math.ceil(mesActual / 3)
  const inicioTrimestre = new Date(anioActual, (trimestreActual - 1) * 3, 1).toISOString()

  const [vencidasRes, nominasRes, proximasRes] = await Promise.all([
    supabase
      .from('facturas')
      .select('perfilId, fechaVencimiento')
      .in('perfilId', ids)
      .eq('estado', 'vencida'),
    supabase
      .from('nominas')
      .select('perfilId, createdAt')
      .in('perfilId', ids),
    supabase
      .from('facturas')
      .select('perfilId, fechaVencimiento')
      .in('perfilId', ids)
      .eq('estado', 'pendiente')
      .not('fechaVencimiento', 'is', null)
      .gte('fechaVencimiento', hoy.toISOString())
      .lte('fechaVencimiento', en15Dias)
      .order('fechaVencimiento', { ascending: true }),
  ])

  // Facturas vencidas > 30 días por perfil
  const vencidasPorPerfil = new Map<string, number>()
  for (const f of vencidasRes.data ?? []) {
    if (!f.fechaVencimiento) continue
    const dias = Math.ceil((hoy.getTime() - new Date(f.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24))
    if (dias > 30) vencidasPorPerfil.set(f.perfilId, (vencidasPorPerfil.get(f.perfilId) ?? 0) + 1)
  }

  // Nóminas: quién tiene (alguna vez) y quién tiene este trimestre
  const tieneNominas = new Set<string>()
  const nominasEsteTrimestre = new Set<string>()
  for (const n of nominasRes.data ?? []) {
    tieneNominas.add(n.perfilId)
    if (n.createdAt && new Date(n.createdAt).getTime() >= new Date(inicioTrimestre).getTime()) {
      nominasEsteTrimestre.add(n.perfilId)
    }
  }

  // Próximo vencimiento (15 días) por perfil: la consulta viene ordenada asc
  const proximaPorPerfil = new Map<string, string>()
  for (const f of proximasRes.data ?? []) {
    if (f.fechaVencimiento && !proximaPorPerfil.has(f.perfilId)) {
      proximaPorPerfil.set(f.perfilId, f.fechaVencimiento)
    }
  }

  for (const perfil of perfiles) {
    const cliente: DatosCliente = {
      perfilId: perfil.id,
      nombre: perfil.nombre,
      email: perfil.email,
    }

    // 1. Facturas vencidas > 30 días
    const nVencidas = vencidasPorPerfil.get(cliente.perfilId) ?? 0
    if (nVencidas > 0) {
      alertas.push({
        id: `fv-${cliente.perfilId}`,
        perfilId: cliente.perfilId,
        nombreCliente: cliente.nombre ?? cliente.email,
        tipo: 'factura_vencida',
        titulo: `${nVencidas} factura(s) vencida(s) > 30 días`,
        descripcion: `El cliente tiene ${nVencidas} factura(s) vencida(s) desde hace más de 30 días.`,
        prioridad: 'alta',
        fechaCreacion: hoy.toISOString(),
        resuelta: false,
      })
    }

    // 2. Modelos fiscales pendientes (criterio por fecha, ya calculado arriba)
    for (const m of modelosPendientes) {
      alertas.push({
        id: `m${m.clave}-${cliente.perfilId}`,
        perfilId: cliente.perfilId,
        nombreCliente: cliente.nombre ?? cliente.email,
        tipo: 'modelo_pendiente',
        titulo: m.titulo,
        descripcion: m.descripcion,
        prioridad: m.prioridad,
        modeloRelacionado: m.clave,
        fechaCreacion: hoy.toISOString(),
        resuelta: false,
      })
    }

    // 3. Nóminas: tiene empleados pero no registró nóminas este trimestre
    if (tieneNominas.has(cliente.perfilId) && !nominasEsteTrimestre.has(cliente.perfilId)) {
      alertas.push({
        id: `nom-${cliente.perfilId}`,
        perfilId: cliente.perfilId,
        nombreCliente: cliente.nombre ?? cliente.email,
        tipo: 'nomina_pendiente',
        titulo: 'Nóminas sin registrar este trimestre',
        descripcion: 'El cliente tiene empleados pero no se han registrado nóminas en el trimestre actual.',
        prioridad: 'media',
        fechaCreacion: hoy.toISOString(),
        resuelta: false,
      })
    }

    // 4. Alertas informativas - próximo vencimiento
    const fechaProxima = proximaPorPerfil.get(cliente.perfilId)
    if (fechaProxima) {
      const dias = Math.ceil((new Date(fechaProxima).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      alertas.push({
        id: `prox-${cliente.perfilId}`,
        perfilId: cliente.perfilId,
        nombreCliente: cliente.nombre ?? cliente.email,
        tipo: 'vencimiento_proximo',
        titulo: `Factura vence en ${dias} día(s)`,
        descripcion: `Una factura vence el ${new Date(fechaProxima).toLocaleDateString('es-ES')}.`,
        prioridad: dias <= 7 ? 'media' : 'baja',
        fechaCreacion: hoy.toISOString(),
        resuelta: false,
      })
    }
  }

  return alertas
}

export function filtrarAlertas(alertas: AlertaGestor[], filtro: 'todas' | 'alta' | 'media' | 'baja'): AlertaGestor[] {
  if (filtro === 'todas') return alertas
  return alertas.filter(a => a.prioridad === filtro)
}

export function agruparPorCliente(alertas: AlertaGestor[]): Map<string, AlertaGestor[]> {
  const mapa = new Map<string, AlertaGestor[]>()
  for (const alerta of alertas) {
    const key = alerta.perfilId
    const existing = mapa.get(key) ?? []
    existing.push(alerta)
    mapa.set(key, existing)
  }
  return mapa
}

export function contarPorPrioridad(alertas: AlertaGestor[]): { alta: number; media: number; baja: number } {
  return {
    alta: alertas.filter(a => a.prioridad === 'alta').length,
    media: alertas.filter(a => a.prioridad === 'media').length,
    baja: alertas.filter(a => a.prioridad === 'baja').length,
  }
}
