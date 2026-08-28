/**
 * Presupuesto anual de impuestos (orientativo).
 *
 * Proyecta las obligaciones fiscales del año según la tendencia de los trimestres ya transcurridos:
 * - IVA (modelo 303): usa los resultados reales de los trimestres con facturas y extrapola el consumo
 *   medio a los trimestres futuros.
 * - Retenciones IRPF del trabajo: se reparten a prorrata trimestral.
 *
 * Todos los importes se manejan en CÉNTIMOS (convención de la app para importes monetarios).
 */

import { calcularModelo303, type FacturaFiscalMinima } from './modelo-303'

export interface PresupuestoAnualDatos {
  /** Facturas del año agrupadas por trimestre (índice 0=T1 ... 3=T4) */
  facturasPorTrimestre: Array<FacturaFiscalMinima[]>
  /** Año fiscal a proyectar */
  anio: number
  /** Retenciones IRPF del trabajo sufridas en el año (céntimos) */
  retencionesTrabajoCents?: number
  /** Trimestre actual (1-4) en curso; los posteriores se proyectan */
  trimestreActual: 1 | 2 | 3 | 4
}

export interface PresupuestoTrimestre {
  trimestre: 1 | 2 | 3 | 4
  real: boolean
  baseRepercutida: number
  cuotaIva: number
  /** Resultado neto del 303 en el trimestre (céntimos, positivo = a ingresar) */
  resultado303: number
  /** Retenciones IRPF estimadas del trimestre (céntimos) */
  retencionesIrpf: number
  /** Total a pagar estimado en el trimestre (céntimos) */
  totalAPagar: number
}

export interface PresupuestoAnualResultado {
  anio: number
  trimestres: PresupuestoTrimestre[]
  /** Totales anuales (céntimos) */
  totalIva: number
  totalRetencionesIrpf: number
  totalImpuestos: number
  /** Lo ya devengado (trimestres reales) */
  devengado: number
  /** Lo proyectado en los trimestres futuros */
  proyectado: number
  avisos: string[]
}

const FACTOR_EXTRAPOLACION = 0.06 // margen prudencial por estacionalidad (aumento leve)

export function calcularPresupuestoAnual(datos: PresupuestoAnualDatos): PresupuestoAnualResultado {
  const avisos: string[] = []
  const { facturasPorTrimestre, anio, trimestreActual } = datos

  const retencionesTotales = Math.max(0, datos.retencionesTrabajoCents ?? 0)
  const retencionesPorTrimestre = retencionesTotales / 4

  const reales: PresupuestoTrimestre[] = []
  const proyectados: PresupuestoTrimestre[] = []

  // Media de cuota IVA y base de los trimestres reales transcurridos
  let sumaIva = 0
  let sumaBase = 0
  let nReales = 0

  for (let t = 1; t <= trimestreActual; t++) {
    const trim = t as 1 | 2 | 3 | 4
    const facturasTrim = facturasPorTrimestre[t - 1] ?? []
    const res303 = calcularModelo303(facturasTrim, trim)
    const base = res303.baseImponibleRepercutida + res303.baseImponibleRepercutida10
    reales.push({
      trimestre: trim,
      real: true,
      baseRepercutida: base,
      cuotaIva: res303.totalCuotaRepercutida,
      resultado303: res303.resultadoLiquidacion,
      retencionesIrpf: retencionesPorTrimestre,
      totalAPagar: Math.max(0, res303.resultadoLiquidacion) + retencionesPorTrimestre,
    })
    sumaIva += res303.totalCuotaRepercutida
    sumaBase += base
    nReales++
  }

  const mediaIva = nReales > 0 ? sumaIva / nReales : 0
  const mediaBase = nReales > 0 ? sumaBase / nReales : 0

  for (let t = trimestreActual + 1; t <= 4; t++) {
    const trim = t as 1 | 2 | 3 | 4
    const baseProy = Math.round(mediaBase * (1 + FACTOR_EXTRAPOLACION))
    const ivaProy = Math.round(mediaIva * (1 + FACTOR_EXTRAPOLACION))
    proyectados.push({
      trimestre: trim,
      real: false,
      baseRepercutida: baseProy,
      cuotaIva: ivaProy,
      resultado303: ivaProy,
      retencionesIrpf: retencionesPorTrimestre,
      totalAPagar: ivaProy + retencionesPorTrimestre,
    })
  }

  const trimestres = [...reales, ...proyectados].sort((a, b) => a.trimestre - b.trimestre)

  const totalIva = trimestres.reduce((s, t) => s + t.cuotaIva, 0)
  const totalRetencionesIrpf = trimestres.reduce((s, t) => s + t.retencionesIrpf, 0)
  const totalImpuestos = trimestres.reduce((s, t) => s + t.totalAPagar, 0)
  const devengado = reales.reduce((s, t) => s + t.totalAPagar, 0)
  const proyectado = proyectados.reduce((s, t) => s + t.totalAPagar, 0)

  avisos.push(
    'Presupuesto orientativo: extrapola la tendencia de los trimestres ya transcurridos a los futuros. No sustituye a la declaración real.'
  )
  if (sumaIva === 0 && nReales > 0) {
    avisos.push('No hay IVA repercutido en los trimestres transcurridos: la proyección parte de cero. Revisa que la facturación esté registrada.')
  }

  return {
    anio,
    trimestres,
    totalIva,
    totalRetencionesIrpf,
    totalImpuestos,
    devengado,
    proyectado,
    avisos,
  }
}
