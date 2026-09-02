'use client'

export function calcularDescuento(baseImponible: number, porcentajeDescuento: number): number {
  if (porcentajeDescuento <= 0 || porcentajeDescuento > 100) return 0
  return Math.round(baseImponible * (porcentajeDescuento / 100))
}

export function aplicarDescuento(
  factura: { baseImponible: number; iva: number },
  descuentoPorcentaje: number
): { importeDescuento: number; totalConDescuento: number } {
  const importeIva = Math.round(factura.baseImponible * (factura.iva / 100))
  const importeDescuento = calcularDescuento(factura.baseImponible, descuentoPorcentaje)
  const totalConDescuento = factura.baseImponible + importeIva - importeDescuento
  return { importeDescuento, totalConDescuento }
}

export function formatoDescuento(porcentaje: number): string {
  return `${porcentaje}% DTO`
}
