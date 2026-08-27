/**
 * Modelo 115 — Retenciones e ingresos a cuenta sobre arrendamientos
 * de inmuebles urbanos (trimestral).
 *
 * El arrendador practica retención del 19% sobre la renta satisfecha.
 * Obligación de presentación trimestral si se superan los umbrales.
 *
 * Fuentes: Art. 75.1.a RIRPF, modelo oficial AEAT.
 */

export interface InmuebleArrendado {
  /** Dirección del inmueble */
  direccion: string
  /** NIF del arrendatario (inquilino) */
  nifArrendatario: string
  /** Base imponible: renta satisfecha en el trimestre (céntimos) */
  baseImponible: number
  /** Tipo de retención aplicado (porcentaje, generalmente 19%) */
  retencionPct: number
}

export interface DatosModelo115 {
  inmuebles: InmuebleArrendado[]
  /** Trimestre del año (1-4) */
  trimestre: 1 | 2 | 3 | 4
}

export interface ResultadoModelo115 {
  /** Total base imponible de todos los inmuebles */
  totalBaseImponible: number
  /** Total retenciones a ingresar */
  totalRetenciones: number
  /** Número de inmuebles declarados */
  numInmuebles: number
  /** Trimestre declarado */
  trimestre: number
  /** Desglose por inmueble */
  desglose: Array<{
    direccion: string
    nifArrendatario: string
    baseImponible: number
    retencionPct: number
    retencion: number
  }>
}

export function calcularModelo115(datos: DatosModelo115): ResultadoModelo115 {
  let totalBaseImponible = 0
  let totalRetenciones = 0

  const desglose = datos.inmuebles.map(inm => {
    const retencion = Math.round(inm.baseImponible * (inm.retencionPct / 100))
    totalBaseImponible += inm.baseImponible
    totalRetenciones += retencion
    return {
      direccion: inm.direccion,
      nifArrendatario: inm.nifArrendatario,
      baseImponible: inm.baseImponible,
      retencionPct: inm.retencionPct,
      retencion,
    }
  })

  return {
    totalBaseImponible,
    totalRetenciones,
    numInmuebles: datos.inmuebles.length,
    trimestre: datos.trimestre,
    desglose,
  }
}
