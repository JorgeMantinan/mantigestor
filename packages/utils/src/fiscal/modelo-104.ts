/**
 * Modelo 104 — Solicitud de devolución acelerada del IRPF.
 *
 * Permite a familias numerosas y a quienes tienen personas con discapacidad a cargo cobrar por
 * anticipado, mes a mes, parte de la devolución de IRPF sin esperar a presentar la declaración.
 * Este módulo orienta sobre el importe mensual que se puede solicitar.
 */

import { reduccionRendimientosTrabajoCents } from './reduccion-trabajo'

export type Categoria104 = 'general' | 'especial' | 'discapacidad'

export interface DatosModelo104 {
  categoria: Categoria104
  /** Nº de hijos (para familia numerosa) o personas a cargo con discapacidad */
  numHijos: number
  /** Retenciones de IRPF sufridas en el año (€, estimación) */
  retencionesAnuales: number
  /** Rendimientos del trabajo anuales brutos (€) — para estimar el exceso de mínimos */
  rendimientosBrutos?: number
}

export interface ResultadoModelo104 {
  minimoBase: number
  retencionesAnuales: number
  devolucionEstimada: number
  mensualSolicitable: number
  capMensual: number
  esElegible: boolean
  avisos: string[]
}

// Mínimos personales y familiares de IRPF (LIRPF) vigentes
const CAP_MENSUAL = 450

function minimoPorCategoria(cat: Categoria104, hijos: number): number {
  switch (cat) {
    case 'discapacidad':
      return 9_000 // mínimo por discapacidad a cargo (orientativo, grado ≥33%)
    case 'especial':
      return 3_000 * Math.max(1, hijos) // familia numerosa especial incrementa el mínimo
    case 'general':
    default:
      return 2_400 + Math.max(0, hijos - 1) * 2_700
  }
}

export function calcularModelo104(datos: DatosModelo104): ResultadoModelo104 {
  const avisos: string[] = []

  const minimoBase = minimoPorCategoria(datos.categoria, datos.numHijos)
  const retencionesAnuales = Math.max(0, datos.retencionesAnuales)

  // Estimación de la devolución: las retenciones sufridas que no se compensan con la cuota.
  // Para orientar, se aproxima la cuota anual sobre la escala y se compara con las retenciones.
  let devolucionEstimada = retencionesAnuales
  if (datos.rendimientosBrutos && datos.rendimientosBrutos > 0) {
    const rendimiento = Math.max(0, datos.rendimientosBrutos - reduccionRendimientosTrabajoCents(Math.round(datos.rendimientosBrutos * 100)) / 100 - minimoBase)
    const cuotaAnual = Math.max(0, rendimiento) * 0.24 // escala media aproximada
    devolucionEstimada = Math.max(0, retencionesAnuales - cuotaAnual)
  }

  const enMensual = devolucionEstimada === 0 ? 0 : devolucionEstimada / 12
  const mensualSolicitable = Math.min(enMensual, CAP_MENSUAL)

  const esElegible = retencionesAnuales > 0

  if (!datos.rendimientosBrutos) {
    avisos.push('Sin datos de rendimientos se estima la devolución solo a partir de las retenciones sufridas. Aporta rendimientos brutos para un cálculo más preciso del exceso de mínimos.')
  }

  return {
    minimoBase,
    retencionesAnuales,
    devolucionEstimada,
    mensualSolicitable,
    capMensual: CAP_MENSUAL,
    esElegible,
    avisos,
  }
}
