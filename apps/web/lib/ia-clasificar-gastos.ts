'use client'

import Anthropic from '@anthropic-ai/sdk'

interface FacturaParaClasificar {
  id: string
  emisorReceptor: string
  nifContraparte?: string | null
  baseImponible: number
  total: number
  notas?: string | null
}

interface GastoClasificado {
  facturaId: string
  categoria: string
  subcategoria: string
  porcentajeDeducibilidad: number
  justificacion: string
}

const CACHE_KEY = 'ia-clasificacion-gastos'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

function getCachedResult(perfilId: string): GastoClasificado[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}-${perfilId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ts: number; data: GastoClasificado[] }
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(`${CACHE_KEY}-${perfilId}`)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function setCachedResult(perfilId: string, data: GastoClasificado[]): void {
  try {
    localStorage.setItem(`${CACHE_KEY}-${perfilId}`, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

export async function clasificarGastos(
  facturas: FacturaParaClasificar[],
  perfilId: string,
): Promise<GastoClasificado[]> {
  const cached = getCachedResult(perfilId)
  if (cached && cached.length >= facturas.length) return cached

  const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
  if (!apiKey) {
    return facturas.map(f => ({
      facturaId: f.id,
      categoria: 'Sin clasificar',
      subcategoria: 'N/A',
      porcentajeDeducibilidad: 0,
      justificacion: 'API key no configurada',
    }))
  }

  const client = new Anthropic({ apiKey })

  const facturasText = facturas
    .map(f => `- ID:${f.id} | ${f.emisorReceptor} | Base: ${f.baseImponible}€ | Total: ${f.total}€ | Notas: ${f.notas ?? 'N/A'}`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Clasifica estos gastos de un autónomo español. Para cada factura, indica:
- categoria (Alimentación, Transporte, Suministros, Servicios profesionales, Seguros, Sanidad, Formación, Marketing, Otros)
- subcategoria (más específica)
- porcentajeDeducibilidad (0-100, según normativa fiscal española: gastos deducibles 100%, gastos parcialmente deducibles, gastos no deducibles 0%)
- justificación (breve explicación de por qué ese porcentaje)

Responde SOLO con JSON válido: [{facturaId, categoria, subcategoria, porcentajeDeducibilidad, justificacion}]

Facturas:
${facturasText}`,
      },
    ],
  })

  const content = response.content[0]
  if (!content || content.type !== 'text') {
    throw new Error('Respuesta inesperada de la IA')
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('No se pudo parsear la respuesta de clasificación')
  }

  const result = JSON.parse(jsonMatch[0]) as GastoClasificado[]
  setCachedResult(perfilId, result)
  return result
}

export function limpiarCacheClasificacion(perfilId: string): void {
  try {
    localStorage.removeItem(`${CACHE_KEY}-${perfilId}`)
  } catch {
    // ignore
  }
}
