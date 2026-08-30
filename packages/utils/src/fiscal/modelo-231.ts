/**
 * Modelo 231 — Declaración informativa de operaciones con criptomonedas.
 *
 * Declaración anual obligatoria para personas físicas y jurídicas que
 * realicen operaciones con criptomonedas, incluyendo compras, ventas
 * e intercambios (swaps) entre distintas criptomonedas.
 *
 * Umbral de presentación: volumen total de operaciones ≥ 50.000€ anuales.
 *
 * Fuentes: Art. 29.2.j LIRPF, Ley 11/2021 (prevención fraude fiscal),
 * modelo oficial AEAT.
 */

export type TipoOperacionCrypto = 'compra' | 'venta' | 'cambio'

export interface OperacionCrypto {
  /** Fecha de la operación (YYYY-MM-DD) */
  fecha: string
  /** Tipo de operación */
  tipoOperacion: TipoOperacionCrypto
  /** Nombre/símbolo de la criptomoneda (BTC, ETH, etc.) */
  criptomoneda: string
  /** Cantidad de unidades de criptomoneda */
  cantidadUnidades: number
  /** Valor de la operación en euros (céntimos) */
  valorEurCents: number
  /** Dirección wallet de origen */
  walletOrigen: string
  /** Dirección wallet de destino */
  walletDestino: string
  /** Coste de adquisición en euros (céntimos) — para calcular ganancia/pérdida */
  costeAdquisicionCents?: number
}

export interface DatosModelo231 {
  ejercicio: number
  nif: string
  denominacion: string
  operaciones: OperacionCrypto[]
}

export interface ResumenOperacionCrypto {
  tipoOperacion: TipoOperacionCrypto
  numOperaciones: number
  volumenTotalCents: number
}

export interface GananciaPerdidaCrypto {
  criptomoneda: string
  gananciaPerdidaCents: number
}

export interface ResultadoModelo231 {
  ejercicio: number
  numOperaciones: number
  volumenTotalCents: number
  volumenTotalEur: number
  resumenPorTipo: ResumenOperacionCrypto[]
  gananciasPerdidas: GananciaPerdidaCrypto[]
  totalGananciaPerdidaCents: number
  obligatorio: boolean
  observaciones: string[]
}

const UMBRAL_PRESENTACION = 50_000_000 // 50.000€ en céntimos

export function calcularModelo231(datos: DatosModelo231): ResultadoModelo231 {
  const observaciones: string[] = []

  let volumenTotalCents = 0
  const porTipo: Record<TipoOperacionCrypto, { num: number; volumen: number }> = {
    compra: { num: 0, volumen: 0 },
    venta: { num: 0, volumen: 0 },
    cambio: { num: 0, volumen: 0 },
  }

  // Acumular ganancias/pérdidas por criptomoneda
  const gananciasPorCrypto = new Map<string, number>()

  for (const op of datos.operaciones) {
    volumenTotalCents += op.valorEurCents
    porTipo[op.tipoOperacion].num++
    porTipo[op.tipoOperacion].volumen += op.valorEurCents

    // Calcular ganancia/pérdida si hay coste de adquisición
    if (op.costeAdquisicionCents !== undefined) {
      const ganancia = op.valorEurCents - op.costeAdquisicionCents
      const actual = gananciasPorCrypto.get(op.criptomoneda) ?? 0
      gananciasPorCrypto.set(op.criptomoneda, actual + ganancia)
    }
  }

  // Calcular si se supera el umbral
  const obligatorio = volumenTotalCents >= UMBRAL_PRESENTACION

  // Resumen por tipo
  const resumenPorTipo: ResumenOperacionCrypto[] = [
    { tipoOperacion: 'compra', numOperaciones: porTipo.compra.num, volumenTotalCents: porTipo.compra.volumen },
    { tipoOperacion: 'venta', numOperaciones: porTipo.venta.num, volumenTotalCents: porTipo.venta.volumen },
    { tipoOperacion: 'cambio', numOperaciones: porTipo.cambio.num, volumenTotalCents: porTipo.cambio.volumen },
  ]

  // Ganancias/pérdidas
  const gananciasPerdidas: GananciaPerdidaCrypto[] = []
  let totalGananciaPerdidaCents = 0
  for (const [cripto, ganancia] of gananciasPorCrypto) {
    gananciasPerdidas.push({ criptomoneda: cripto, gananciaPerdidaCents: ganancia })
    totalGananciaPerdidaCents += ganancia
  }

  // Avisos
  if (!obligatorio) {
    observaciones.push(
      `Volumen (${formatEUR(volumenTotalCents)}) inferior al umbral de ${formatEUR(UMBRAL_PRESENTACION)} — no obligatorio`,
    )
  }

  if (porTipo.cambio.num > 0) {
    observaciones.push(
      `${porTipo.cambio.num} operaciones de cambio (swap) declaradas — tributan como ganancia/pérdida patrimonial`,
    )
  }

  if (datos.operaciones.some((op) => !op.walletOrigen || !op.walletDestino)) {
    observaciones.push('Algunas operaciones no tienen wallets de origen/destino — verificar datos')
  }

  return {
    ejercicio: datos.ejercicio,
    numOperaciones: datos.operaciones.length,
    volumenTotalCents,
    volumenTotalEur: Math.round(volumenTotalCents / 100),
    resumenPorTipo,
    gananciasPerdidas,
    totalGananciaPerdidaCents,
    obligatorio,
    observaciones,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export const TIPOS_OPERACION_CRYPTO: readonly { valor: TipoOperacionCrypto; label: string }[] = [
  { valor: 'compra', label: 'Compra de criptomoneda' },
  { valor: 'venta', label: 'Venta de criptomoneda' },
  { valor: 'cambio', label: 'Cambio (swap) entre criptomonedas' },
] as const
