// Art. 20 LIRPF — Reducción por obtención de rendimientos del trabajo.
// Reducción de base imponible. Sin cambios para 2026 (sin norma modificadora publicada).
// Valores contrastados con AEAT Manual Renta 2025 y guiafiscal.es (ago-2026).

export interface ReduccionTrabajoParams {
  tramo1HastaCentimos?: number   // 1.485.200 = 14.852,00 €
  cuotaFijaCentimos?: number     //   730.200 =  7.302,00 €
  coeficientePendiente?: number  //       175 =      1,75
  limiteTramo2Centimos?: number  // 1.767.352 = 17.673,52 €
  cuotaTramo3BaseCentimos?: number // 236.434 =  2.364,34 €
  coeficienteTramo3?: number     //       114 =      1,14
}

const DEFAULT_2025: Required<ReduccionTrabajoParams> = {
  tramo1HastaCentimos: 1_485_200,
  cuotaFijaCentimos: 730_200,
  coeficientePendiente: 175,
  limiteTramo2Centimos: 1_767_352,
  cuotaTramo3BaseCentimos: 236_434,
  coeficienteTramo3: 114,
}

export function reduccionRendimientosTrabajoCents(
  rendimientoNetoCentimos: number,
  params?: ReduccionTrabajoParams,
): number {
  if (!Number.isInteger(rendimientoNetoCentimos)) throw new Error('El rendimiento neto debe ser un entero en céntimos')
  if (rendimientoNetoCentimos < 0) throw new Error('El rendimiento neto no puede ser negativo')

  const p = { ...DEFAULT_2025, ...params }

  if (rendimientoNetoCentimos <= p.tramo1HastaCentimos) return p.cuotaFijaCentimos

  const eurosExcesoTramo2 = (rendimientoNetoCentimos - p.tramo1HastaCentimos) / 100
  if (rendimientoNetoCentimos <= p.limiteTramo2Centimos) {
    return Math.max(0, Math.round(p.cuotaFijaCentimos - p.coeficientePendiente * eurosExcesoTramo2))
  }

  const eurosExcesoTramo3 = (rendimientoNetoCentimos - p.limiteTramo2Centimos) / 100
  return Math.max(
    0,
    Math.round(p.cuotaTramo3BaseCentimos - p.coeficienteTramo3 * eurosExcesoTramo3),
  )
}

// DA 61ª LIRPF — Deducción por obtención de rendimientos del trabajo (Ley 5/2025).
// Reduce cuota íntegra (no base). Aplica al final del cálculo.
// 2025: 340€ base, umbral 16.576€, tope 18.276€, coef. 0,2
// 2026: 590,89€ base, umbral 17.094€, tope 20.048,45€, coef. 0,2 (RDL 5/2026)

export interface DeduccionTrabajoParams {
  importeBaseCentimos: number   // 2025: 34.000 = 340€  |  2026: 59.089 = 590,89€
  umbralCentimos: number        // 2025: 1.657.600 = 16.576€  |  2026: 1.709.400 = 17.094€
  topeCentimos: number          // 2025: 1.827.600 = 18.276€  |  2026: 2.004.845 = 20.048,45€
  coeficiente: number           // 0,2 (ambos años)
}

export const DEDUCCION_TRABAJO_2025: DeduccionTrabajoParams = {
  importeBaseCentimos: 34_000,
  umbralCentimos: 1_657_600,
  topeCentimos: 1_827_600,
  coeficiente: 0.2,
}

export const DEDUCCION_TRABAJO_2026: DeduccionTrabajoParams = {
  importeBaseCentimos: 59_089,
  umbralCentimos: 1_709_400,
  topeCentimos: 2_004_845,
  coeficiente: 0.2,
}

export function deduccionTrabajoCents(
  rendimientosIntegrosCentimos: number,
  params: DeduccionTrabajoParams,
  cuotaIntegraAtribuibleTrabajoCentimos?: number,
): number {
  if (rendimientosIntegrosCentimos > params.topeCentimos) return 0
  if (rendimientosIntegrosCentimos < 0) return 0

  let deduccion: number
  if (rendimientosIntegrosCentimos <= params.umbralCentimos) {
    deduccion = params.importeBaseCentimos
  } else {
    const exceso = (rendimientosIntegrosCentimos - params.umbralCentimos) / 100
    deduccion = Math.max(0, Math.round(params.importeBaseCentimos - params.coeficiente * exceso * 100))
  }

  // Límite: no puede exceder la parte de la cuota íntegra atribuible a rendimientos del trabajo
  if (cuotaIntegraAtribuibleTrabajoCentimos != null) {
    deduccion = Math.min(deduccion, cuotaIntegraAtribuibleTrabajoCentimos)
  }

  return Math.max(0, deduccion)
}
