export interface TramoReta {
  tabla: string
  tramo: number
  rendimientoNetoDesdeEur: number
  rendimientoNetoHastaEur: number | null
  baseMinimaEur: number
  baseMaximaEur: number | null
  cuotaMinimaRefEur: number | null
}

export interface EstimacionReta {
  tramoSeleccionado: TramoReta
  baseMinimaCentimos: number
  baseMaximaCentimos: number | null
  cuotaEstimadaMinCentimos: number | null
  cuotaEstimadaMaxCentimos: number | null
}

const PCT_COTIZACION_POR_DEFECTO = 31.5

export function seleccionarTramoReta(
  rendimientoNetoMensualEnCentimos: number,
  tramos: TramoReta[],
): TramoReta {
  if (!Number.isInteger(rendimientoNetoMensualEnCentimos)) throw new Error('El rendimiento neto mensual debe ser un entero en céntimos')
  if (rendimientoNetoMensualEnCentimos < 0) throw new Error('El rendimiento neto no puede ser negativo')
  const tramosOrdenados = [...tramos].sort((a, b) => a.rendimientoNetoDesdeEur - b.rendimientoNetoDesdeEur)
  const rendimientoEur = rendimientoNetoMensualEnCentimos / 100

  for (const t of tramosOrdenados) {
    if (rendimientoEur >= t.rendimientoNetoDesdeEur && (t.rendimientoNetoHastaEur === null || rendimientoEur <= t.rendimientoNetoHastaEur)) {
      return t
    }
  }

  const ultimo = tramosOrdenados[tramosOrdenados.length - 1]
  if (ultimo && ultimo.rendimientoNetoHastaEur === null) return ultimo
  throw new Error(`No hay tramo RETA para un rendimiento de ${rendimientoEur} €/mes`)
}

export function estimarCuotaReta(
  tramo: TramoReta,
  pctCotizacion = PCT_COTIZACION_POR_DEFECTO,
): EstimacionReta {
  if (pctCotizacion <= 0 || pctCotizacion > 100) throw new Error('Porcentaje de cotización inválido')

  const cuotaDe = (baseEur: number | null): number | null =>
    baseEur === null ? null : Math.round(baseEur * 100 * (pctCotizacion / 100))

  return {
    tramoSeleccionado: tramo,
    baseMinimaCentimos: Math.round(tramo.baseMinimaEur * 100),
    baseMaximaCentimos: tramo.baseMaximaEur === null ? null : Math.round(tramo.baseMaximaEur * 100),
    cuotaEstimadaMinCentimos: cuotaDe(tramo.baseMinimaEur),
    cuotaEstimadaMaxCentimos: cuotaDe(tramo.baseMaximaEur),
  }
}
