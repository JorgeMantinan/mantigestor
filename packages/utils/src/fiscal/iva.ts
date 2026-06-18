export type PorcentajeIva = 0 | 4 | 10 | 21

export interface DesglosIva {
  base: number
  porcentaje: PorcentajeIva
  importeIva: number
  importeTotal: number
}

export function calcularIva(baseEnCentimos: number, porcentaje: PorcentajeIva): DesglosIva {
  if (baseEnCentimos < 0) throw new Error('El importe base no puede ser negativo')
  if (!Number.isInteger(baseEnCentimos)) throw new Error('El importe base debe ser un entero en céntimos')

  const importeIva = Math.round(baseEnCentimos * (porcentaje / 100))
  const importeTotal = baseEnCentimos + importeIva

  return { base: baseEnCentimos, porcentaje, importeIva, importeTotal }
}

export function extraerBaseDeTotal(totalConIvaEnCentimos: number, porcentaje: PorcentajeIva): DesglosIva {
  const divisor = 1 + (porcentaje / 100)
  const base = Math.round(totalConIvaEnCentimos / divisor)
  const importeIva = totalConIvaEnCentimos - base

  return { base, porcentaje, importeIva, importeTotal: totalConIvaEnCentimos }
}
