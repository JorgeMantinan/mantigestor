interface FacturaCobro {
  tipo: string
  fechaEmision: string
  fechaVencimiento: string | null
  total: number
  estado: string
}

interface RatioCobro {
  diasMedioCobro: number | null
  porcentajeCobrado: number
  facturasVencidas: number
  montoPendiente: number
  totalEmitido: number
}

export function calcularRatioCobro(facturas: FacturaCobro[]): RatioCobro {
  const emitidas = facturas.filter(f => f.tipo === 'ingreso')

  if (emitidas.length === 0) {
    return {
      diasMedioCobro: null,
      porcentajeCobrado: 0,
      facturasVencidas: 0,
      montoPendiente: 0,
      totalEmitido: 0,
    }
  }

  const cobradas = emitidas.filter(f => f.estado === 'pagada')
  const pendientes = emitidas.filter(f => f.estado === 'pendiente')
  const ahora = new Date()

  const facturasVencidas = pendientes.filter(f => {
    if (!f.fechaVencimiento) return false
    return new Date(f.fechaVencimiento) < ahora
  }).length

  const montoPendiente = pendientes.reduce((s, f) => s + f.total, 0)
  const totalEmitido = emitidas.reduce((s, f) => s + f.total, 0)

  const porcentajeCobrado = emitidas.length > 0
    ? Math.round((cobradas.length / emitidas.length) * 100)
    : 0

  let diasMedioCobro: number | null = null
  if (cobradas.length > 0) {
    const totalDias = cobradas.reduce((s, f) => {
      const emision = new Date(f.fechaEmision)
      const diasDesdeEmision = Math.round((ahora.getTime() - emision.getTime()) / (1000 * 60 * 60 * 24))
      return s + Math.max(0, diasDesdeEmision)
    }, 0)
    diasMedioCobro = Math.round(totalDias / cobradas.length)
  }

  return {
    diasMedioCobro,
    porcentajeCobrado,
    facturasVencidas,
    montoPendiente,
    totalEmitido,
  }
}
