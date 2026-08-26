/**
 * Modelo 190 — Declaración anual de retenciones e ingresos a cuenta.
 * Resumen de todas las retenciones practicadas durante el año.
 *
 * Fuentes: Art. 100-104 RIRPF, modelo oficial AEAT.
 * Prácticamente es el Modelo 111 anual, pero con más tipos de rendimiento.
 */

export interface RendimientoRetencion190 {
  /** Tipo de rendimiento */
  tipo: 'trabajo' | 'profesional' | 'arrendamiento' | 'otros'
  /** Descripción del pagador o concepto */
  descripcion: string
  /** NIF del pagador */
  nifPagador: string
  /** Importe bruto satisfecho en céntimos */
  brutoCents: number
  /** Tipo de retención aplicado (%) */
  tipoRetencionPct: number
  /** Retención practicada en céntimos */
  retencionCents: number
}

export interface ResultadoModelo190 {
  /** Rendimientos del trabajo */
  trabajoBruto: number
  trabajoRetenciones: number
  numPagadoresTrabajo: number
  /** Rendimientos de actividades profesionales */
  profesionalBruto: number
  profesionalRetenciones: number
  numPagadoresProfesional: number
  /** Rendimientos de arrendamiento de inmuebles urbanos */
  arrendamientoBruto: number
  arrendamientoRetenciones: number
  numPagadoresArrendamiento: number
  /** Otros rendimientos */
  otrosBruto: number
  otrosRetenciones: number
  numPagadoresOtros: number
  /** Totales */
  totalBruto: number
  totalRetenciones: number
  totalPagadores: number
}

/**
 * Calcula el Modelo 190 a partir de una lista de rendimientos con retención.
 * Para autónomos/empresas que han practicado retenciones durante el año.
 */
export function calcularModelo190(
  rendimientos: RendimientoRetencion190[]
): ResultadoModelo190 {
  let trabajoBruto = 0
  let trabajoRetenciones = 0
  const pagadoresTrabajo = new Set<string>()
  let profesionalBruto = 0
  let profesionalRetenciones = 0
  const pagadoresProfesional = new Set<string>()
  let arrendamientoBruto = 0
  let arrendamientoRetenciones = 0
  const pagadoresArrendamiento = new Set<string>()
  let otrosBruto = 0
  let otrosRetenciones = 0
  const pagadoresOtros = new Set<string>()

  for (const r of rendimientos) {
    const bruto = r.brutoCents
    const ret = r.retencionCents || Math.round(bruto * (r.tipoRetencionPct / 100))

    switch (r.tipo) {
      case 'trabajo':
        trabajoBruto += bruto
        trabajoRetenciones += ret
        pagadoresTrabajo.add(r.nifPagador || r.descripcion)
        break
      case 'profesional':
        profesionalBruto += bruto
        profesionalRetenciones += ret
        pagadoresProfesional.add(r.nifPagador || r.descripcion)
        break
      case 'arrendamiento':
        arrendamientoBruto += bruto
        arrendamientoRetenciones += ret
        pagadoresArrendamiento.add(r.nifPagador || r.descripcion)
        break
      case 'otros':
        otrosBruto += bruto
        otrosRetenciones += ret
        pagadoresOtros.add(r.nifPagador || r.descripcion)
        break
    }
  }

  const totalBruto = trabajoBruto + profesionalBruto + arrendamientoBruto + otrosBruto
  const totalRetenciones = trabajoRetenciones + profesionalRetenciones + arrendamientoRetenciones + otrosRetenciones
  const totalPagadores = pagadoresTrabajo.size + pagadoresProfesional.size + pagadoresArrendamiento.size + pagadoresOtros.size

  return {
    trabajoBruto,
    trabajoRetenciones,
    numPagadoresTrabajo: pagadoresTrabajo.size,
    profesionalBruto,
    profesionalRetenciones,
    numPagadoresProfesional: pagadoresProfesional.size,
    arrendamientoBruto,
    arrendamientoRetenciones,
    numPagadoresArrendamiento: pagadoresArrendamiento.size,
    otrosBruto,
    otrosRetenciones,
    numPagadoresOtros: pagadoresOtros.size,
    totalBruto,
    totalRetenciones,
    totalPagadores,
  }
}
