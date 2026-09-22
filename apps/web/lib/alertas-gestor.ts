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

  for (const perfil of perfiles) {
    const cliente: DatosCliente = {
      perfilId: perfil.id,
      nombre: perfil.nombre,
      email: perfil.email,
    }

    // 1. Verificar facturas vencidas > 30 días
    const { data: facturasVencidas } = await supabase
      .from('facturas')
      .select('id, fechaVencimiento, total')
      .eq('perfilId', cliente.perfilId)
      .eq('estado', 'vencida')

    if (facturasVencidas && facturasVencidas.length > 0) {
      const vencidas30d = facturasVencidas.filter(f => {
        if (!f.fechaVencimiento) return false
        const dv = Math.ceil((hoy.getTime() - new Date(f.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24))
        return dv > 30
      })
      if (vencidas30d.length > 0) {
        alertas.push({
          id: `fv-${cliente.perfilId}`,
          perfilId: cliente.perfilId,
          nombreCliente: cliente.nombre ?? cliente.email,
          tipo: 'factura_vencida',
          titulo: `${vencidas30d.length} factura(s) vencida(s) > 30 días`,
          descripcion: `El cliente tiene ${vencidas30d.length} factura(s) vencida(s) desde hace más de 30 días.`,
          prioridad: 'alta',
          fechaCreacion: hoy.toISOString(),
          resuelta: false,
        })
      }
    }

    // 2. Verificar modelos fiscales pendientes (basado en calendario)
    const plazosHoy = calendario.filter(p => {
      const diff = Math.ceil((p.fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 30
    })

    // 303 IVA trimestral
    if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
      const plazo303 = plazosHoy.find(p => p.descripcion.includes('303'))
      if (plazo303) {
        alertas.push({
          id: `m303-${cliente.perfilId}`,
          perfilId: cliente.perfilId,
          nombreCliente: cliente.nombre ?? cliente.email,
          tipo: 'modelo_pendiente',
          titulo: 'Modelo 303 sin presentar',
          descripcion: `El plazo para el Modelo 303 (IVA trimestral) vence el ${plazo303.fechaLimite.toLocaleDateString('es-ES')}.`,
          prioridad: 'alta',
          modeloRelacionado: '303',
          fechaCreacion: hoy.toISOString(),
          resuelta: false,
        })
      }
    }

    // 130 pago fraccionado
    if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
      const plazo130 = plazosHoy.find(p => p.descripcion.includes('130'))
      if (plazo130) {
        alertas.push({
          id: `m130-${cliente.perfilId}`,
          perfilId: cliente.perfilId,
          nombreCliente: cliente.nombre ?? cliente.email,
          tipo: 'modelo_pendiente',
          titulo: 'Modelo 130 sin presentar',
          descripcion: `El plazo para el Modelo 130 (pago fraccionado) vence el ${plazo130.fechaLimite.toLocaleDateString('es-ES')}.`,
          prioridad: 'alta',
          modeloRelacionado: '130',
          fechaCreacion: hoy.toISOString(),
          resuelta: false,
        })
      }
    }

    // 111 retenciones
    if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
      const plazo111 = plazosHoy.find(p => p.descripcion.includes('111'))
      if (plazo111) {
        alertas.push({
          id: `m111-${cliente.perfilId}`,
          perfilId: cliente.perfilId,
          nombreCliente: cliente.nombre ?? cliente.email,
          tipo: 'modelo_pendiente',
          titulo: 'Modelo 111 sin presentar',
          descripcion: `El plazo para el Modelo 111 (retenciones) vence el ${plazo111.fechaLimite.toLocaleDateString('es-ES')}.`,
          prioridad: 'media',
          modeloRelacionado: '111',
          fechaCreacion: hoy.toISOString(),
          resuelta: false,
        })
      }
    }

    // 3. Verificar nóminas (si tiene empleados)
    const { data: nominas } = await supabase
      .from('nominas')
      .select('id')
      .eq('perfilId', cliente.perfilId)

    if (nominas && nominas.length > 0) {
      const trimestreActual = Math.ceil(mesActual / 3)
      const inicioTrimestre = new Date(anioActual, (trimestreActual - 1) * 3, 1)
      const { data: nominasTrimestre } = await supabase
        .from('nominas')
        .select('id')
        .eq('perfilId', cliente.perfilId)
        .gte('createdAt', inicioTrimestre.toISOString())

      if (!nominasTrimestre || nominasTrimestre.length === 0) {
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
    }

    // 4. Alertas informativas - próximo vencimiento
    const facturasProximas = await supabase
      .from('facturas')
      .select('fechaVencimiento')
      .eq('perfilId', cliente.perfilId)
      .eq('estado', 'pendiente')
      .not('fechaVencimiento', 'is', null)
      .gte('fechaVencimiento', hoy.toISOString())
      .lte('fechaVencimiento', new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString())
      .order('fechaVencimiento', { ascending: true })
      .limit(1)

    if (facturasProximas.data && facturasProximas.data.length > 0) {
      const proxima = facturasProximas.data[0]
      if (proxima?.fechaVencimiento) {
        const dias = Math.ceil((new Date(proxima.fechaVencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        alertas.push({
          id: `prox-${cliente.perfilId}`,
          perfilId: cliente.perfilId,
          nombreCliente: cliente.nombre ?? cliente.email,
          tipo: 'vencimiento_proximo',
          titulo: `Factura vence en ${dias} día(s)`,
          descripcion: `Una factura vence el ${new Date(proxima.fechaVencimiento).toLocaleDateString('es-ES')}.`,
          prioridad: dias <= 7 ? 'media' : 'baja',
          fechaCreacion: hoy.toISOString(),
          resuelta: false,
        })
      }
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
