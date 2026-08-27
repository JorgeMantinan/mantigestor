/**
 * Modelo 232 — Operaciones vinculadas y paraísos fiscales
 *
 * Obligatorio cuando el volumen de operaciones con personas o entidades
 * vinculadas supera los 250.000€ en el ejercicio.
 */

export interface OperacionVinculada {
  tipo: string
  contraparte: string
  nif: string
  importe: number
  metodo: string
}

export interface DatosModelo232 {
  operaciones: OperacionVinculada[]
  umbralVinculadas?: number
}

export interface ResultadoModelo232 {
  numOperaciones: number
  totalVinculadas: number
  umbral: number
  obligatorio: boolean
  resumen: string
}

const UMBRAL_DEFAULT = 25_000_000 // 250.000€ en céntimos

export function calcularModelo232(datos: DatosModelo232): ResultadoModelo232 {
  const umbral = datos.umbralVinculadas ?? UMBRAL_DEFAULT

  const totalVinculadas = datos.operaciones.reduce((sum, op) => sum + op.importe, 0)
  const numOperaciones = datos.operaciones.length
  const obligatorio = totalVinculadas > umbral

  const resumen = obligatorio
    ? `OBLIGATORIO: Total operaciones vinculadas (${formatEUR(totalVinculadas)}) supera el umbral de ${formatEUR(umbral)}`
    : `No obligatorio. Total: ${formatEUR(totalVinculadas)} (umbral: ${formatEUR(umbral)})`

  return {
    numOperaciones,
    totalVinculadas,
    umbral,
    obligatorio,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export const METODOS_VINCULACION = [
  'Precio libre',
  'Coste más margen',
  'Precio de reventa',
  'Cota de mercado',
] as const
