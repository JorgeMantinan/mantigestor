/**
 * Modelo 282 — Declaración informativa de entidades en régimen de
 * transparencia fiscal.
 *
 * Obligatorio para entidades de inversión colectiva y otros vehículos
 * sometidos al régimen de transparencia fiscal.
 * Fuentes: Art. 36.2 LIS, normativa AEAT.
 */

export interface RentaImputada282 {
  /** Tipo de renta (dividendos, intereses, plusvalías, etc.) */
  tipo: string
  /** Importe de la renta (céntimos) */
  importeCents: number
}

export interface Participacion282 {
  /** Denominación de la sociedad participada */
  sociedad: string
  /** NIF de la sociedad */
  nif: string
  /** Porcentaje de participación (%) */
  porcentaje: number
}

export interface EntidadTransparencia282 {
  /** Razón social de la entidad */
  razonSocial: string
  /** NIF de la entidad */
  nif: string
  /** Tipo de entidad (fondo, SICAV, etc.) */
  tipoEntidad: string
  /** Rentas imputadas */
  rentasImputadas: RentaImputada282[]
  /** Participaciones */
  participaciones: Participacion282[]
}

export interface ResultadoModelo282 {
  totalRentasImputadas: number
  numParticipaciones: number
  numRentas: number
}

function sumarRentas(rentas: RentaImputada282[]): number {
  let total = 0
  for (const r of rentas) {
    total += r.importeCents
  }
  return total
}

export function calcularModelo282(
  entidad: EntidadTransparencia282
): ResultadoModelo282 {
  const totalRentasImputadas = sumarRentas(entidad.rentasImputadas)

  return {
    totalRentasImputadas,
    numParticipaciones: entidad.participaciones.length,
    numRentas: entidad.rentasImputadas.length,
  }
}
