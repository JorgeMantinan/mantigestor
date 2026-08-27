/**
 * Modelo 714 — Impuesto sobre el Patrimonio
 * Declaración anual si el patrimonio neto supera los 700.000€
 * Bonificaciones varían por comunidad autónoma
 */

export interface BienPatrimonio {
  tipo: string
  descripcion: string
  valor: number
  deudas: number
}

export interface DatosModelo714 {
  bienes: BienPatrimonio[]
  comunidadAutonoma: string
}

export interface ResultadoModelo714 {
  valorTotal: number
  deudas: number
  baseImponible: number
  obligatorio: boolean
  bonificacionAplicable: string
  porcentajeBonificacion: number
  resumen: string
}

const UMBRAL = 70_000_000 // 700.000€

const BONIFICACIONES: Record<string, { porcentaje: number; descripcion: string }> = {
  'Andalucía': { porcentaje: 0.99, descripcion: 'Bonificación del 99% (derechos consolidados)' },
  'Aragón': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'Asturias': { porcentaje: 0.30, descripcion: 'Bonificación del 30% sobre cuota' },
  'Canarias': { porcentaje: 0.50, descripcion: 'Bonificación del 50% sobre cuota' },
  'Cantabria': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'Castilla y León': { porcentaje: 0.50, descripcion: 'Bonificación del 50% sobre cuota' },
  'Castilla-La Mancha': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'Cataluña': { porcentaje: 0.75, descripcion: 'Bonificación del 75% (prima preventive)' },
  'Extremadura': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'Galicia': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'Islas Baleares': { porcentaje: 0.50, descripcion: 'Bonificación del 50% sobre cuota' },
  'La Rioja': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'C. Valenciana': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'Comunidad Valenciana': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'Murcia': { porcentaje: 0.25, descripcion: 'Bonificación del 25% sobre cuota' },
  'Navarra': { porcentaje: 0.50, descripcion: 'Bonificación del 50% sobre cuota' },
  'País Vasco': { porcentaje: 0.50, descripcion: 'Bonificación del 50% sobre cuota (convenio)' },
}

export const COMUNIDADES_AUTONOMAS = Object.keys(BONIFICACIONES).sort()

export function calcularModelo714(datos: DatosModelo714): ResultadoModelo714 {
  const { bienes, comunidadAutonoma } = datos

  const valorTotal = bienes.reduce((sum, b) => sum + b.valor, 0)
  const deudas = bienes.reduce((sum, b) => sum + b.deudas, 0)
  const baseImponible = Math.max(0, valorTotal - deudas)

  const obligatorio = baseImponible > UMBRAL

  const bonif = BONIFICACIONES[comunidadAutonoma]
  const bonificacionAplicable = bonif?.descripcion ?? 'Sin bonificación autonómica conocida'
  const porcentajeBonificacion = bonif?.porcentaje ?? 0

  const resumen = obligatorio
    ? `OBLIGATORIO: Base imponible (${formatEUR(baseImponible)}) supera el umbral de ${formatEUR(UMBRAL)}`
    : `No obligatorio. Base imponible: ${formatEUR(baseImponible)} (umbral: ${formatEUR(UMBRAL)})`

  return {
    valorTotal,
    deudas,
    baseImponible,
    obligatorio,
    bonificacionAplicable,
    porcentajeBonificacion,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
