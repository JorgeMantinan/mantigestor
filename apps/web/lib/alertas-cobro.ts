export interface AlertaCobro {
  facturaId: string
  cliente: string
  importe: number
  diasVencida: number
  nivel: 'vencida-hoy' | 'vencida-semana' | 'vencida-mes' | 'por-vencer'
}

interface FacturaInput {
  id: string
  tipo: string
  emisorReceptor: string
  fechaVencimiento: string | null
  total: number
  estado: string
}

const MS_POR_DIA = 86_400_000

export function detectarAlertasCobro(facturas: FacturaInput[]): AlertaCobro[] {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const alertas: AlertaCobro[] = []

  for (const f of facturas) {
    if (f.tipo !== 'ingreso') continue
    if (f.estado !== 'pendiente') continue
    if (!f.fechaVencimiento) continue

    const vencimiento = new Date(f.fechaVencimiento)
    vencimiento.setHours(0, 0, 0, 0)
    const diffMs = hoy.getTime() - vencimiento.getTime()
    const diasVencida = Math.round(diffMs / MS_POR_DIA)

    if (diasVencida < 0) {
      // Por vencer
      if (Math.abs(diasVencida) <= 3) {
        alertas.push({
          facturaId: f.id,
          cliente: f.emisorReceptor,
          importe: f.total,
          diasVencida,
          nivel: 'por-vencer',
        })
      }
      continue
    }

    let nivel: AlertaCobro['nivel']
    if (diasVencida === 0) {
      nivel = 'vencida-hoy'
    } else if (diasVencida <= 7) {
      nivel = 'vencida-semana'
    } else {
      nivel = 'vencida-mes'
    }

    alertas.push({
      facturaId: f.id,
      cliente: f.emisorReceptor,
      importe: f.total,
      diasVencida,
      nivel,
    })
  }

  // Sort: worst first (most days overdue), then por-vencer at end
  alertas.sort((a, b) => {
    if (a.nivel === 'por-vencer' && b.nivel !== 'por-vencer') return 1
    if (a.nivel !== 'por-vencer' && b.nivel === 'por-vencer') return -1
    return b.diasVencida - a.diasVencida
  })

  return alertas
}

export function totalVencido(alertas: AlertaCobro[]): number {
  return alertas
    .filter(a => a.nivel !== 'por-vencer')
    .reduce((sum, a) => sum + a.importe, 0)
}
