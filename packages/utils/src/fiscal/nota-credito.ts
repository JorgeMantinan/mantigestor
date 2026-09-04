/**
 * Generación automática de notas de crédito a partir de facturas.
 */

export interface DatosFacturaOriginal {
  id: string
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
}

export interface DatosNotaCredito {
  facturaOriginalId: string
  motivo: string
  baseImponible: number
  iva: number
  total: number
}

/**
 * Genera el número de nota de crédito a partir del número de factura original.
 * Ejemplo: F-2026-001 → NC-F-2026-001
 */
export function generarNumeroNC(numeroFactura: string): string {
  return `NC-${numeroFactura}`
}

/**
 * Calcula los importes de la nota de crédito como percentage de la factura original.
 */
export function calcularNotaCredito(
  factura: DatosFacturaOriginal,
  porcentaje: number // 0-100
): DatosNotaCredito {
  const factor = porcentaje / 100
  const baseImponible = Math.round(factura.baseImponible * factor)
  const iva = Math.round(factura.iva * factor)
  const total = baseImponible + iva

  return {
    facturaOriginalId: factura.id,
    motivo: `Nota de crédito parcial (${porcentaje}%) sobre factura ${factura.numero}`,
    baseImponible,
    iva,
    total,
  }
}

/**
 * Calcula nota de crédito por devolución completa.
 */
export function calcularNotaCreditoTotal(factura: DatosFacturaOriginal): DatosNotaCredito {
  return {
    facturaOriginalId: factura.id,
    motivo: `Nota de crédito total - devolución factura ${factura.numero}`,
    baseImponible: factura.baseImponible,
    iva: factura.iva,
    total: factura.total,
  }
}
