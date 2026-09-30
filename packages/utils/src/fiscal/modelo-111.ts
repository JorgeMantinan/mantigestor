/**
 * Modelo 111 — Declaración trimestral de retenciones e ingresos a cuenta
 * del IRPF sobre rendimientos del trabajo, actividades profesionales,
 * arrendamiento de inmuebles urbanos y otros rendimientos.
 *
 * Fuentes: Art. 74-80 RIRPF, modelo oficial AEAT.
 */

export interface RendimientoRetencion {
  /** Tipo de rendimiento */
  tipo: 'trabajo' | 'profesional' | 'arrendamiento' | 'agricola' | 'otros'
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
  /** Rendimientos de actividades agrícolas, ganaderas y forestales (claves G.08/H.01/H.03 del 190) */
  agricolaBruto: number
  agricolaRetenciones: number
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
  let agricolaBruto = 0
  let agricolaRetenciones = 0
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
      case 'agricola':
        agricolaBruto += bruto
        agricolaRetenciones += ret
        break
      case 'otros':
        otrosBruto += bruto
        otrosRetenciones += ret
        break
    }
  }

  const totalBruto = trabajoBruto + profesionalBruto + arrendamientoBruto + agricolaBruto + otrosBruto
  const totalRetenciones =
    trabajoRetenciones + profesionalRetenciones + arrendamientoRetenciones + agricolaRetenciones + otrosRetenciones
  const aIngresar = Math.max(0, totalRetenciones - pagosAnteriores)

  return {
    trabajoBruto,
    trabajoRetenciones,
    profesionalBruto,
    profesionalRetenciones,
    arrendamientoBruto,
    arrendamientoRetenciones,
    agricolaBruto,
    agricolaRetenciones,
    otrosBruto,
    otrosRetenciones,
    totalBruto,
    totalRetenciones,
    aIngresar,
  }
}

/**
 * Tipos de retención habituales en España (ejercicios 2025 y 2026 — cuadro
 * informativo de tipos de retención de la AEAT):
 * - Trabajo: escala 19-47 % según el algoritmo de la AEAT (mínimo 2 %)
 * - Profesionales: 15 % general; 7 % en determinadas actividades y en el año de
 *   inicio de la actividad y los dos siguientes (art. 101.5.a LIRPF)
 * - Arrendamiento de inmuebles urbanos (modelo 115): 19 %
 * - Agrícolas y ganaderas: 2 % (engorde de porcino y avicultura: 1 %); forestales: 2 %
 * - Premios de juegos, concursos y sorteos: 19 %
 * - Cesión de derechos de imagen: 24 %
 * - Reducción del 60 % para rentas de Ceuta y Melilla (art. 68.4 LIRPF)
 */
export const TIPOS_RETENCION_HABITUALES = {
  trabajoGeneral: 15,
  profesionalGeneral: 15,
  profesionalPrimeros3Anios: 7,
  arrendamientoUrbano: 19,
  agricolaGanadera: 2,
  porcinoAvicultura: 1,
  forestal: 2,
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
  totalAgricolaBruto: number
  totalAgricolaRetenciones: number
  totalOtrosBruto: number
  totalOtrosRetenciones: number
  totalBruto: number
  totalRetenciones: number
} {
  let totalTrabajoBruto = 0, totalTrabajoRetenciones = 0
  let totalProfesionalBruto = 0, totalProfesionalRetenciones = 0
  let totalArrendamientoBruto = 0, totalArrendamientoRetenciones = 0
  let totalAgricolaBruto = 0, totalAgricolaRetenciones = 0
  let totalOtrosBruto = 0, totalOtrosRetenciones = 0

  for (const t of trimestres) {
    totalTrabajoBruto += t.trabajoBruto
    totalTrabajoRetenciones += t.trabajoRetenciones
    totalProfesionalBruto += t.profesionalBruto
    totalProfesionalRetenciones += t.profesionalRetenciones
    totalArrendamientoBruto += t.arrendamientoBruto
    totalArrendamientoRetenciones += t.arrendamientoRetenciones
    totalAgricolaBruto += t.agricolaBruto
    totalAgricolaRetenciones += t.agricolaRetenciones
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
    totalAgricolaBruto,
    totalAgricolaRetenciones,
    totalOtrosBruto,
    totalOtrosRetenciones,
    totalBruto: totalTrabajoBruto + totalProfesionalBruto + totalArrendamientoBruto + totalAgricolaBruto + totalOtrosBruto,
    totalRetenciones: totalTrabajoRetenciones + totalProfesionalRetenciones + totalArrendamientoRetenciones + totalAgricolaRetenciones + totalOtrosRetenciones,
  }
}
