/**
 * Modelo 721 — Declaración informativa sobre monedas virtuales en el extranjero
 * Obligatorio si el valor de las monedas virtuales en exchanges extranjeros supera los 50.000€
 */

export interface ExchangeVirtual {
  nombre: string
  pais: string
  tipoMoneda: string
  saldoFin: number
  valorMercado: number
  operaciones: number
}

export interface DatosModelo721 {
  exchanges: ExchangeVirtual[]
}

export interface ResultadoPorExchange {
  nombre: string
  pais: string
  tipoMoneda: string
  saldoFin: number
  valorMercado: number
  operaciones: number
}

export interface ResultadoModelo721 {
  valorTotal: number
  obligatorio: boolean
  porExchange: ResultadoPorExchange[]
  resumen: string
}

const UMBRAL = 5_000_000 // 50.000€

export function calcularModelo721(datos: DatosModelo721): ResultadoModelo721 {
  const { exchanges } = datos

  const porExchange: ResultadoPorExchange[] = exchanges.map(ex => ({
    nombre: ex.nombre,
    pais: ex.pais,
    tipoMoneda: ex.tipoMoneda,
    saldoFin: ex.saldoFin,
    valorMercado: ex.valorMercado,
    operaciones: ex.operaciones,
  }))

  const valorTotal = exchanges.reduce((sum, ex) => sum + ex.valorMercado, 0)

  const obligatorio = valorTotal > UMBRAL

  const resumen = obligatorio
    ? `OBLIGATORIO: El valor total (${formatEUR(valorTotal)}) supera el umbral de ${formatEUR(UMBRAL)}`
    : `No obligatorio. Valor total: ${formatEUR(valorTotal)} (umbral: ${formatEUR(UMBRAL)})`

  return {
    valorTotal,
    obligatorio,
    porExchange,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
