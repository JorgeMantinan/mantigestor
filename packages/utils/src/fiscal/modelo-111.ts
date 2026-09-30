/**
 * Modelo 111 — Declaración trimestral de retenciones e ingresos a cuenta
 * del IRPF sobre rendimientos del trabajo, actividades profesionales,
 * arrendamiento de inmuebles urbanos y otros rendimientos.
 *
 * Fuentes: Art. 74-80 RIRPF, modelo oficial AEAT.
 */

export interface RendimientoRetencion {
  /** Tipo de rendimiento */
  tipo: 'trabajo' | 'profesional' | 'arrendamiento' | 'otros'
  /** Descripción del pagador o concepto */
  descripcion: string
  /** Importe bruto satisfecho en céntimos */
  brutoCents: number
  /** Tipo de retención aplicado (%) */
  tipoRetencionPct: number
  /** Retención practicada en céntimos */
  retencionCents: number
}

export interface ResultadoModelo111 {
  /** Rendimientos del trabajo */
  trabajoBruto: number
  trabajoRetenciones: number
  /** Rendimientos de actividades profesionales */
  profesionalBruto: number
  profesionalRetenciones: number
  /** Rendimientos de arrendamiento de inmuebles urbanos */
  arrendamientoBruto: number
  arrendamientoRetenciones: number
  /** Otros rendimientos */
  otrosBruto: number
  otrosRetenciones: number
  /** Totales */
  totalBruto: number
  totalRetenciones: number
  /** A ingresar (diferencia si hubiera pagos parciales) */
  aIngresar: number
}

/**
 * Calcula el Modelo 111 a partir de una lista de rendimientos con retención.
 * Para autónomos/empresas que practican retenciones a sus trabajadores o profesionales.
 */
export function calcularModelo111(
  rendimientos: RendimientoRetencion[],
  pagosAnteriores: number = 0
): ResultadoModelo111 {
  let trabajoBruto = 0
  let trabajoRetenciones = 0
  let profesionalBruto = 0
  let profesionalRetenciones = 0
  let arrendamientoBruto = 0
  let arrendamientoRetenciones = 0
  let otrosBruto = 0
  let otrosRetenciones = 0

  for (const r of rendimientos) {
    const bruto = r.brutoCents
    const ret = r.retencionCents || Math.round(bruto * (r.tipoRetencionPct / 100))

    switch (r.tipo) {
      case 'trabajo':
        trabajoBruto += bruto
        trabajoRetenciones += ret
        break
      case 'profesional':
        profesionalBruto += bruto
        profesionalRetenciones += ret
        break
      case 'arrendamiento':
        arrendamientoBruto += bruto
        arrendamientoRetenciones += ret
        break
      case 'otros':
        otrosBruto += bruto
        otrosRetenciones += ret
        break
    }
  }

  const totalBruto = trabajoBruto + profesionalBruto + arrendamientoBruto + otrosBruto
  const totalRetenciones = trabajoRetenciones + profesionalRetenciones + arrendamientoRetenciones + otrosRetenciones
  const aIngresar = Math.max(0, totalRetenciones - pagosAnteriores)

  return {
    trabajoBruto,
    trabajoRetenciones,
    profesionalBruto,
    profesionalRetenciones,
    arrendamientoBruto,
    arrendamientoRetenciones,
    otrosBruto,
    otrosRetenciones,
    totalBruto,
    totalRetenciones,
    aIngresar,
  }
}

/**
 * Tipos de retención habituales en España (2025/2026):
 * - Trabajo: el tipo lo fija el algoritmo de la AEAT (15%-45%); 15% como referencia mínima
 *   (para un tipo fijo por modelo 145 usar la calculadora del modelo 145)
 * - Profesionales: 15% (7% en el año de inicio de la actividad y los dos siguientes)
 * - Arrendamiento de inmuebles urbanos (modelo 115): 19%
 * - Premios de juegos, concursos y sorteos: 19%
 * - Cesión de derechos de imagen: 24%
 */
export const TIPOS_RETENCION_HABITUALES = {
  trabajoGeneral: 15,
  profesionalGeneral: 15,
  profesionalPrimeros3Anios: 7,
  arrendamientoUrbano: 19,
  premios: 19,
  cesionImagen: 24,
} as const

/**
 * Calcula la retención sobre un bruto dado.
 */
export function calcularRetencion(brutoCents: number, tipoRetencionPct: number): number {
  return Math.round(brutoCents * tipoRetencionPct / 100)
}

/**
 * Calcula el resumen anual de retenciones (Modelo 190) a partir de 4 trimestres.
 */
export function resumenAnualRetenciones111(
  trimestres: Array<ResultadoModelo111>
): {
  totalTrabajoBruto: number
  totalTrabajoRetenciones: number
  totalProfesionalBruto: number
  totalProfesionalRetenciones: number
  totalArrendamientoBruto: number
  totalArrendamientoRetenciones: number
  totalOtrosBruto: number
  totalOtrosRetenciones: number
  totalBruto: number
  totalRetenciones: number
} {
  let totalTrabajoBruto = 0, totalTrabajoRetenciones = 0
  let totalProfesionalBruto = 0, totalProfesionalRetenciones = 0
  let totalArrendamientoBruto = 0, totalArrendamientoRetenciones = 0
  let totalOtrosBruto = 0, totalOtrosRetenciones = 0

  for (const t of trimestres) {
    totalTrabajoBruto += t.trabajoBruto
    totalTrabajoRetenciones += t.trabajoRetenciones
    totalProfesionalBruto += t.profesionalBruto
    totalProfesionalRetenciones += t.profesionalRetenciones
    totalArrendamientoBruto += t.arrendamientoBruto
    totalArrendamientoRetenciones += t.arrendamientoRetenciones
    totalOtrosBruto += t.otrosBruto
    totalOtrosRetenciones += t.otrosRetenciones
  }

  return {
    totalTrabajoBruto,
    totalTrabajoRetenciones,
    totalProfesionalBruto,
    totalProfesionalRetenciones,
    totalArrendamientoBruto,
    totalArrendamientoRetenciones,
    totalOtrosBruto,
    totalOtrosRetenciones,
    totalBruto: totalTrabajoBruto + totalProfesionalBruto + totalArrendamientoBruto + totalOtrosBruto,
    totalRetenciones: totalTrabajoRetenciones + totalProfesionalRetenciones + totalArrendamientoRetenciones + totalOtrosRetenciones,
  }
}
