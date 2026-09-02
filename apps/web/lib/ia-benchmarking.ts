export interface Insight {
  tipo: 'positivo' | 'alerta' | 'neutro'
  titulo: string
  descripcion: string
  impacto: 'alto' | 'medio' | 'bajo'
}

interface FacturaBenchmark {
  tipo: string
  total: number
  baseImponible: number
  iva: number
  categoriaGasto: string | null
  fechaEmision: string
}

interface DatosSector {
  margenBruto: number
  ratioGastos: number
  diasCobroMedio: number
  categoriasTop: { nombre: string; porcentaje: number }[]
}

const SECTORES: Record<string, DatosSector> = {
  default: {
    margenBruto: 0.35,
    ratioGastos: 0.65,
    diasCobroMedio: 45,
    categoriasTop: [
      { nombre: 'Suministros', porcentaje: 0.15 },
      { nombre: 'Servicios profesionales', porcentaje: 0.12 },
      { nombre: 'Alquiler', porcentaje: 0.10 },
      { nombre: 'Marketing', porcentaje: 0.08 },
      { nombre: 'Tecnología', porcentaje: 0.07 },
    ],
  },
  tecnologia: {
    margenBruto: 0.55,
    ratioGastos: 0.45,
    diasCobroMedio: 30,
    categoriasTop: [
      { nombre: 'Software', porcentaje: 0.18 },
      { nombre: 'Servidores', porcentaje: 0.12 },
      { nombre: 'Marketing digital', porcentaje: 0.10 },
      { nombre: 'Formación', porcentaje: 0.08 },
      { nombre: 'Consultoría', porcentaje: 0.06 },
    ],
  },
  servicios: {
    margenBruto: 0.45,
    ratioGastos: 0.55,
    diasCobroMedio: 40,
    categoriasTop: [
      { nombre: 'Nóminas', porcentaje: 0.40 },
      { nombre: 'Oficina', porcentaje: 0.10 },
      { nombre: 'Seguros', porcentaje: 0.08 },
      { nombre: 'Formación', porcentaje: 0.05 },
      { nombre: 'Marketing', porcentaje: 0.04 },
    ],
  },
  retail: {
    margenBruto: 0.25,
    ratioGastos: 0.75,
    diasCobroMedio: 15,
    categoriasTop: [
      { nombre: 'Mercancía', porcentaje: 0.50 },
      { nombre: 'Alquiler local', porcentaje: 0.12 },
      { nombre: 'Suministros', porcentaje: 0.08 },
      { nombre: 'Personal', porcentaje: 0.06 },
      { nombre: 'Marketing', porcentaje: 0.04 },
    ],
  },
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function calcularMetricas(facturas: FacturaBenchmark[]) {
  const ingresos = facturas.filter(f => f.tipo === 'ingreso')
  const gastos = facturas.filter(f => f.tipo === 'gasto')

  const totalIngresos = ingresos.reduce((s, f) => s + f.total, 0)
  const totalGastos = gastos.reduce((s, f) => s + f.total, 0)
  const totalBaseImponible = facturas.reduce((s, f) => s + f.baseImponible, 0)
  const totalIva = facturas.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)

  const beneficio = totalIngresos - totalGastos
  const margenBruto = totalIngresos > 0 ? (totalIngresos - totalGastos) / totalIngresos : 0
  const ratioGastos = totalIngresos > 0 ? totalGastos / totalIngresos : 0

  const gastosPorCategoria = new Map<string, number>()
  gastos.forEach(f => {
    const cat = f.categoriaGasto || 'Sin categoría'
    gastosPorCategoria.set(cat, (gastosPorCategoria.get(cat) ?? 0) + f.total)
  })

  const categoriasOrdenadas = Array.from(gastosPorCategoria.entries())
    .map(([nombre, total]) => ({
      nombre,
      total,
      porcentaje: totalGastos > 0 ? total / totalGastos : 0,
    }))
    .sort((a, b) => b.total - a.total)

  return {
    totalIngresos,
    totalGastos,
    beneficio,
    margenBruto,
    ratioGastos,
    categoriasOrdenadas,
    ingresosCount: ingresos.length,
    gastosCount: gastos.length,
    totalBaseImponible,
    totalIva,
  }
}

function calcularPuntuacion(metricas: ReturnType<typeof calcularMetricas>, sector: DatosSector): number {
  let puntos = 50

  const diffMargen = metricas.margenBruto - sector.margenBruto
  puntos += Math.round(diffMargen * 100)

  const diffRatio = sector.ratioGastos - metricas.ratioGastos
  puntos += Math.round(diffRatio * 60)

  if (metricas.beneficio > 0) puntos += 10
  else puntos -= 10

  if (metricas.totalIngresos > 0 && metricas.ingresosCount >= 5) puntos += 5

  return Math.max(0, Math.min(100, puntos))
}

function generarInsights(
  metricas: ReturnType<typeof calcularMetricas>,
  sector: DatosSector,
  sectorNombre: string
): Insight[] {
  const insights: Insight[] = []

  const diffMargen = metricas.margenBruto - sector.margenBruto
  if (diffMargen > 0.05) {
    insights.push({
      tipo: 'positivo',
      titulo: 'Margen superior al sector',
      descripcion: `Tu margen bruto (${(metricas.margenBruto * 100).toFixed(1)}%) supera la media del sector ${sectorNombre} (${(sector.margenBruto * 100).toFixed(1)}%). Excelente gestión de costes.`,
      impacto: 'alto',
    })
  } else if (diffMargen < -0.05) {
    insights.push({
      tipo: 'alerta',
      titulo: 'Margen por debajo del sector',
      descripcion: `Tu margen bruto (${(metricas.margenBruto * 100).toFixed(1)}%) está por debajo de la media del sector ${sectorNombre} (${(sector.margenBruto * 100).toFixed(1)}%). Revisa tus costes.`,
      impacto: 'alto',
    })
  } else {
    insights.push({
      tipo: 'neutro',
      titulo: 'Margen en línea con el sector',
      descripcion: `Tu margen bruto (${(metricas.margenBruto * 100).toFixed(1)}%) es similar a la media del sector ${sectorNombre} (${(sector.margenBruto * 100).toFixed(1)}%).`,
      impacto: 'medio',
    })
  }

  if (metricas.ratioGastos > sector.ratioGastos + 0.05) {
    insights.push({
      tipo: 'alerta',
      titulo: 'Gastos por encima de la media',
      descripcion: `Tus gastos representan el ${(metricas.ratioGastos * 100).toFixed(1)}% de los ingresos, por encima del ${(sector.ratioGastos * 100).toFixed(1)}% del sector. Optimiza tus categorías con mayor gasto.`,
      impacto: 'alto',
    })
  } else if (metricas.ratioGastos < sector.ratioGastos - 0.05) {
    insights.push({
      tipo: 'positivo',
      titulo: 'Gastos controlados',
      descripcion: `Tus gastos representan el ${(metricas.ratioGastos * 100).toFixed(1)}% de los ingresos, por debajo del ${(sector.ratioGastos * 100).toFixed(1)}% del sector. Buen control.`,
      impacto: 'medio',
    })
  }

  const categoriasAnomalas = metricas.categoriasOrdenadas.filter(c => {
    const sectorCat = sector.categoriasTop.find(s => s.nombre.toLowerCase() === c.nombre.toLowerCase())
    if (!sectorCat) return c.porcentaje > 0.15
    return c.porcentaje > sectorCat.porcentaje * 1.5
  })

  if (categoriasAnomalas.length > 0) {
    const mayor = categoriasAnomalas[0]
    insights.push({
      tipo: 'alerta',
      titulo: `Gasto elevado en ${mayor?.nombre}`,
      descripcion: `La categoría "${mayor?.nombre}" representa el ${((mayor?.porcentaje ?? 0) * 100).toFixed(1)}% de tus gastos totales (${formatEuro(mayor?.total ?? 0)}), significativamente por encima de la media del sector.`,
      impacto: 'medio',
    })
  }

  if (metricas.beneficio < 0) {
    insights.push({
      tipo: 'alerta',
      titulo: 'Beneficio negativo',
      descripcion: `Estás generando pérdidas de ${formatEuro(Math.abs(metricas.beneficio))}. Revisa urgentemente la estructura de costes.`,
      impacto: 'alto',
    })
  } else if (metricas.beneficio > metricas.totalIngresos * 0.2) {
    insights.push({
      tipo: 'positivo',
      titulo: 'Beneficio saludable',
      descripcion: `Beneficio de ${formatEuro(metricas.beneficio)} (${String(((metricas.beneficio / metricas.totalIngresos) * 100).toFixed(1))}% de los ingresos).`,
      impacto: 'medio',
    })
  }

  if (metricas.totalIva > 0 && metricas.totalIva > metricas.totalIngresos * 0.15) {
    insights.push({
      tipo: 'neutro',
      titulo: 'IVA a ingresar elevado',
      descripcion: `El IVA a ingresar es ${formatEuro(metricas.totalIva)}. Considera si hay IVA soportado que no estás deduciendo.`,
      impacto: 'bajo',
    })
  }

  return insights.slice(0, 5)
}

function generarRecomendaciones(
  metricas: ReturnType<typeof calcularMetricas>,
  sector: DatosSector
): string[] {
  const recs: string[] = []

  if (metricas.ratioGastos > sector.ratioGastos) {
    recs.push('Analiza tus categorías de gasto y busca donde puedes reducir sin afectar la calidad.')
  }

  const categoriasSuperiores = metricas.categoriasOrdenadas.filter(c => {
    const s = sector.categoriasTop.find(x => x.nombre.toLowerCase() === c.nombre.toLowerCase())
    return s && c.porcentaje > s.porcentaje * 1.2
  })

  if (categoriasSuperiores.length > 0) {
    const nom = categoriasSuperiores[0]?.nombre
    recs.push(`Revisa los gastos en "${nom}" — están por encima de lo habitual en tu sector.`)
  }

  if (metricas.beneficio < 0) {
    recs.push('Prioriza reducir gastos fijos o aumentar precios para volver a beneficios.')
  } else if (metricas.margenBruto < sector.margenBruto) {
    recs.push('Considera ajustar precios al alza o buscar proveedores más competitivos.')
  }

  if (metricas.ingresosCount < 3) {
    recs.push('Diversifica tus fuentes de ingreso para reducir la dependencia de pocos clientes.')
  }

  if (metricas.totalIva > metricas.totalIngresos * 0.12) {
    recs.push('Asegúrate de deducir todo el IVA soportado en gastos deducibles.')
  }

  if (recs.length === 0) {
    recs.push('Mantén el buen equilibrio entre ingresos y gastos.')
    recs.push('Revisa periódicamente las categorías para detectar desviaciones temprano.')
  }

  return recs.slice(0, 5)
}

export function analizarBenchmarking(
  facturas: FacturaBenchmark[],
  sector: string = 'default'
) {
  const datosSector = SECTORES[sector] ?? SECTORES.default!
  const metricas = calcularMetricas(facturas)
  const puntuacion = calcularPuntuacion(metricas, datosSector)
  const insights = generarInsights(metricas, datosSector, sector)
  const recomendaciones = generarRecomendaciones(metricas, datosSector)

  return {
    puntuacion,
    insights,
    recomendaciones,
    metricas: {
      margenBruto: metricas.margenBruto,
      ratioGastos: metricas.ratioGastos,
      beneficio: metricas.beneficio,
      totalIngresos: metricas.totalIngresos,
      totalGastos: metricas.totalGastos,
    },
  }
}
