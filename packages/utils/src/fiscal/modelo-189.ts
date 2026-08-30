/**
 * Modelo 189 — Declaración informativa de rentas exentas.
 *
 * Recoge las rentas exentas del IRPF satisfechas por las Administraciones
 * Públicas y por otros obligados (becas, seguros de vida, invalideces, etc.).
 * Fuentes: Art. 13-15 LIRPF, modelo oficial AEAT.
 */

export type TipoRenta189 =
  | 'beca'
  | 'seguro_vida'
  | 'invalidez'
  | 'pension'
  | 'ayuda_publica'
  | 'otra'

export interface RentaExenta189 {
  /** Nombre del beneficiario */
  beneficiario: string
  /** NIF del beneficiario */
  nif: string
  /** Tipo de renta exenta */
  tipoRenta: TipoRenta189
  /** Importe de la renta exenta en céntimos */
  importeCents: number
  /** Descripción de la renta */
  descripcion: string
}

export interface DesgloseTipoRenta189 {
  tipoRenta: TipoRenta189
  numBeneficiarios: number
  numRentas: number
  totalImporteCents: number
}

export interface ResultadoModelo189 {
  totalRentasExentasCents: number
  numBeneficiarios: number
  numRentas: number
  desglosePorTipo: DesgloseTipoRenta189[]
}

export function calcularModelo189(
  rentasExentas: RentaExenta189[]
): ResultadoModelo189 {
  let totalRentasExentasCents = 0
  const beneficiarios = new Set<string>()
  const porTipo = new Map<TipoRenta189, DesgloseTipoRenta189>()

  for (const r of rentasExentas) {
    totalRentasExentasCents += r.importeCents
    beneficiarios.add(r.nif || r.beneficiario)

    const existente = porTipo.get(r.tipoRenta)
    if (existente) {
      existente.numBeneficiarios++
      existente.numRentas++
      existente.totalImporteCents += r.importeCents
    } else {
      porTipo.set(r.tipoRenta, {
        tipoRenta: r.tipoRenta,
        numBeneficiarios: 1,
        numRentas: 1,
        totalImporteCents: r.importeCents,
      })
    }
  }

  return {
    totalRentasExentasCents,
    numBeneficiarios: beneficiarios.size,
    numRentas: rentasExentas.length,
    desglosePorTipo: Array.from(porTipo.values()),
  }
}

export function formatearImporte189(cents: number): string {
  const euros = cents / 100
  return euros.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function etiquetaTipoRenta(tipo: TipoRenta189): string {
  const etiquetas: Record<TipoRenta189, string> = {
    beca: 'Beca',
    seguro_vida: 'Seguro de vida',
    invalidez: 'Invalidez',
    pension: 'Pensión',
    ayuda_publica: 'Ayuda pública',
    otra: 'Otra',
  }
  return etiquetas[tipo]
}
