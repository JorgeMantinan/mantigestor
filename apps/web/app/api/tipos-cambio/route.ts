import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit-ip'

const TASAS_FALLBACK: Record<string, number> = {
  'USD-EUR': 0.92,
  'EUR-USD': 1.09,
  'GBP-EUR': 1.17,
  'EUR-GBP': 0.85,
  'CHF-EUR': 1.04,
  'EUR-CHF': 0.96,
  'CAD-EUR': 0.68,
  'EUR-CAD': 1.47,
  'AUD-EUR': 0.6,
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

function tasasFallback(base: string, simbolos: string[]): Record<string, number> {
  const rates: Record<string, number> = { [base]: 1 }
  for (const simbolo of simbolos) {
    if (simbolo === base) continue
    const key = `${base}-${simbolo}`
    const inversa = `${simbolo}-${base}`
    if (TASAS_FALLBACK[key] !== undefined) {
      rates[simbolo] = TASAS_FALLBACK[key]
    } else if (TASAS_FALLBACK[inversa] !== undefined) {
      rates[simbolo] = 1 / TASAS_FALLBACK[inversa]
    }
  }
  return rates
}

export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 60, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const { searchParams } = new URL(req.url)
    const base = (searchParams.get('base') ?? 'EUR').toUpperCase()
    const pedidas = searchParams.get('simbolos')?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) ?? []
    const simbolos = pedidas.length > 0
      ? pedidas
      : ['USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'MXN', 'ARS', 'COP', 'BRL']

    const publica = searchParams.get('publica')
    if (publica === '1') {
      const todas = ['USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'MXN', 'ARS', 'COP', 'BRL']
      return NextResponse.json({
        base,
        rates: tasasFallback(base, todas),
        fuente: 'fallback',
        actualizadoEn: new Date().toISOString(),
      })
    }

    try {
      const apiUrl = `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${simbolos.join(',')}`
      const res = await fetch(apiUrl, { next: { revalidate: 3600 } })
      if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`)
      const data = await res.json()
      if (data?.rates && typeof data.rates === 'object') {
        const rates = { ...data.rates }
        rates[base] = 1
        return NextResponse.json({ base, rates, fuente: 'frankfurter', actualizadoEn: new Date().toISOString() })
      }
      throw new Error('Rate not found in response')
    } catch {
      return NextResponse.json({
        base,
        rates: tasasFallback(base, simbolos),
        fuente: 'fallback',
        actualizadoEn: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Error en /api/tipos-cambio:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}