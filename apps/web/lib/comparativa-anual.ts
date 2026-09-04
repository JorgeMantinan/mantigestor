export interface ComparativaItem {
  actual: number
  anterior: number
  variacionPorcentual: number
}

export interface ResultadoComparativa {
  ingresos: ComparativaItem
  gastos: ComparativaItem
  beneficio: ComparativaItem
  iva: ComparativaItem
  mesComparado: string
}

interface FacturaInput {
  tipo: string
  baseImponible: number
  iva: number
  total: number
  fechaEmision: string
}

export function compararConAnoAnterior(facturas: FacturaInput[], anyoActual: number): ResultadoComparativa {
  const mesActual = new Date().getMonth()
  const meses = Array.from({ length: mesActual + 1 }, (_, i) => i)

  const filtrar = (anyo: number, tipo: string) => facturas.filter(f => {
    const d = new Date(f.fechaEmision)
    return d.getFullYear() === anyo && meses.includes(d.getMonth()) && f.tipo === tipo
  })

  const sumar = (arr: FacturaInput[], campo: keyof FacturaInput) => arr.reduce((s, f) => s + (f[campo] as number), 0)

  const ingActual = sumar(filtrar(anyoActual, 'ingreso'), 'total')
  const ingAnterior = sumar(filtrar(anyoActual - 1, 'ingreso'), 'total')
  const gasActual = sumar(filtrar(anyoActual, 'gasto'), 'total')
  const gasAnterior = sumar(filtrar(anyoActual - 1, 'gasto'), 'total')
  const ivaActual = sumar(filtrar(anyoActual, 'ingreso'), 'iva') - sumar(filtrar(anyoActual, 'gasto'), 'iva')
  const ivaAnterior = sumar(filtrar(anyoActual - 1, 'ingreso'), 'iva') - sumar(filtrar(anyoActual - 1, 'gasto'), 'iva')

  const calc = (actual: number, anterior: number): ComparativaItem => ({
    actual,
    anterior,
    variacionPorcentual: anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : actual > 0 ? 100 : 0
  })

  return {
    ingresos: calc(ingActual, ingAnterior),
    gastos: calc(gasActual, gasAnterior),
    beneficio: calc(ingActual - gasActual, ingAnterior - gasAnterior),
    iva: calc(ivaActual, ivaAnterior),
    mesComparado: new Date(anyoActual, mesActual).toLocaleDateString('es-ES', { month: 'long' })
  }
}
