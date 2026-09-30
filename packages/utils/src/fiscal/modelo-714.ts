/**
 * Modelo 714 — Impuesto sobre el Patrimonio
 * Declaración anual: obligatoria con cuota a ingresar o si el patrimonio neto
 * supera los 700.000 € (y en todo caso con bienes por más de 2.000.000 €).
 *
 * Bonificación general de la cuota por CCAA (Ministerio de Hacienda,
 * «Tributación Autonómica. Medidas 2026», Cap. I): 100 % Madrid (2009),
 * Andalucía (2022), Extremadura (2023), Cantabria (2024) y La Rioja (2025);
 * 50 % Galicia; el resto sin bonificación general (Navarra y País Vasco: régimen
 * foral). Las bonificaciones del 99-100 % por parentesco son de Sucesiones y
 * Donaciones, no del Impuesto sobre el Patrimonio.
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
  'Madrid': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2009)' },
  'Andalucía': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2022)' },
  'Extremadura': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2023)' },
  'Cantabria': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2024)' },
  'La Rioja': { porcentaje: 1, descripcion: 'Bonificación del 100% de la cuota (desde 2025)' },
  'Galicia': { porcentaje: 0.5, descripcion: 'Bonificación del 50% de la cuota' },
  'Aragón': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Asturias': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Canarias': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Castilla y León': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Castilla-La Mancha': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Cataluña': { porcentaje: 0, descripcion: 'Sin bonificación general (tipos propios)' },
  'Islas Baleares': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Murcia': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'C. Valenciana': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Comunidad Valenciana': { porcentaje: 0, descripcion: 'Sin bonificación general en cuota' },
  'Navarra': { porcentaje: 0, descripcion: 'Régimen foral: se tributa por la normativa foral' },
  'País Vasco': { porcentaje: 0, descripcion: 'Régimen foral: se tributa por la normativa foral' },
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
