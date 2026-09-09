import Anthropic from '@anthropic-ai/sdk'

interface FacturaPendiente {
  id: string
  numero: string
  emisorReceptor: string
  total: number
}

interface CoincidenciaIA {
  facturaId: string
  puntuacion: number
}

export async function buscarCoincidenciasConIA(
  concepto: string,
  importe: number,
  facturasPendientes: FacturaPendiente[]
): Promise<CoincidenciaIA | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (facturasPendientes.length === 0) return null

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Dada una transacción bancaria "${concepto}" por ${importe}€, ¿cuál de estas facturas pendientes coincide mejor?

${facturasPendientes.map(f => `- ${f.numero}: ${f.emisorReceptor} (${f.total}€)`).join('\n')}

Responde SOLO con JSON: { "facturaId": "id", "confidence": 0.0-1.0 } o { "facturaId": null, "confidence": 0 }`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = response.content[0]
    if (!block || block.type !== 'text') return null
    const text = block.text
    const jsonMatch = text.match(/\{[^}]+\}/)
    if (!jsonMatch) return null

    const result = JSON.parse(jsonMatch[0]) as { facturaId?: string | null; confidence?: number }
    if (result.confidence && result.confidence > 0.7 && result.facturaId) {
      return { facturaId: result.facturaId, puntuacion: Math.round(result.confidence * 100) }
    }
  } catch (e) {
    console.error('AI reconciliation failed:', e)
  }
  return null
}
