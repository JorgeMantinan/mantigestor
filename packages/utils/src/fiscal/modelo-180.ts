/**
 * Modelo 180 — Declaración anual de retenciones e ingresos a cuenta
 * sobre arrendamientos de inmuebles urbanos.
 *
 * Es el resumen anual del Modelo 115 (trimestral).
 * Fuentes: Art. 75.1.c RIRPF, modelo oficial AEAT.
 */

export interface RendimientoArrendamiento180 {
  /** Dirección del inmueble */
  direccion: string
  /** NIF del inquilino */
  nifInquilino: string
  /** Nombre del inquilino */
  nombreInquilino: string
  /** Rentas percibidas en el año (céntimos) */
  rentasPercibidasCents: number
  /** Tipo de retención (%) — 19% general, 24% si no residing */
  tipoRetencionPct: number
  /** Retención practicada (céntimos) */
  retencionCents: number
}

export interface ResultadoModelo180 {
  totalRentas: number
  totalRetenciones: number
  numInquilinos: number
  numInmuebles: number
}

export function calcularModelo180(
  arrendamientos: RendimientoArrendamiento180[]
): ResultadoModelo180 {
  let totalRentas = 0
  let totalRetenciones = 0
  const inquilinos = new Set<string>()
  const inmuebles = new Set<string>()

  for (const a of arrendamientos) {
    const ret = a.retencionCents || Math.round(a.rentasPercibidasCents * (a.tipoRetencionPct / 100))
    totalRentas += a.rentasPercibidasCents
    totalRetenciones += ret
    inquilinos.add(a.nifInquilino || a.nombreInquilino)
    inmuebles.add(a.direccion)
  }

  return {
    totalRentas,
    totalRetenciones,
    numInquilinos: inquilinos.size,
    numInmuebles: inmuebles.size,
  }
}
