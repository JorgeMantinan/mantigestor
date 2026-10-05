export interface Moneda {
  code: string
  name: string
  symbol: string
}

export const MOEDAS: Moneda[] = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
  { code: 'CHF', name: 'Franco suizo', symbol: 'CHF' },
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'C$' },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'A$' },
  { code: 'JPY', name: 'Yen japonés', symbol: '¥' },
  { code: 'MXN', name: 'Peso mexicano', symbol: 'MX$' },
  { code: 'ARS', name: 'Peso argentino', symbol: 'AR$' },
  { code: 'COP', name: 'Peso colombiano', symbol: 'COL$' },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$' },
]

const TASAS_FALLBACK: Record<string, number> = {
  'USD-EUR': 0.92,
  'EUR-USD': 1.09,
  'GBP-EUR': 1.17,
  'EUR-GBP': 0.85,
  'CHF-EUR': 1.04,
  'EUR-CHF': 0.96,
  'CAD-EUR': 0.68,
  'EUR-CAD': 1.47,
  'AUD-EUR': 0.60,
  'EUR-AUD': 1.67,
  'JPY-EUR': 0.0061,
  'EUR-JPY': 164.0,
  'MXN-EUR': 0.053,
  'EUR-MXN': 18.8,
  'ARS-EUR': 0.00085,
  'EUR-ARS': 1176.0,
  'COP-EUR': 0.00023,
  'EUR-COP': 4348.0,
  'BRL-EUR': 0.18,
  'EUR-BRL': 5.56,
}

export async function obtenerTasaCambio(
  desde: string,
  hasta: string
): Promise<number> {
  if (desde === hasta) return 1

  try {
    const res = await fetch(`/api/tipos-cambio?base=${desde}&simbolos=${hasta}`)
    if (!res.ok) throw new Error(`API tipos-cambio error: ${res.status}`)
    const data: { rates?: Record<string, number> } = await res.json()
    if (typeof data.rates?.[hasta] === 'number') {
      return data.rates[hasta]
    }
    throw new Error('Rate not found in response')
  } catch {
    const key = `${desde}-${hasta}`
    if (TASAS_FALLBACK[key] !== undefined) return TASAS_FALLBACK[key]
    const inverseKey = `${hasta}-${desde}`
    if (TASAS_FALLBACK[inverseKey] !== undefined) return 1 / TASAS_FALLBACK[inverseKey]
    return 1
  }
}

export function convertirMoneda(
  cantidad: number,
  desde: string,
  hasta: string,
  tasa: number
): number {
  if (desde === hasta) return cantidad
  return cantidad * tasa
}

export function formatoMoneda(cantidad: number, moneda: string): string {
  const decimales = moneda === 'JPY' ? 0 : 2
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(cantidad)
}

export function formatoMonedaUniversal(cantidad: number, moneda: string): string {
  const monedaInfo = MOEDAS.find(m => m.code === moneda)
  if (!monedaInfo) return `${cantidad.toFixed(2)} ${moneda}`
  const decimales = moneda === 'JPY' ? 0 : 2
  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(cantidad)
  if (['EUR'].includes(moneda)) {
    return `${formatted}${monedaInfo.symbol}`
  }
  return `${monedaInfo.symbol}${formatted}`
}
