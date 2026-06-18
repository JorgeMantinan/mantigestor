export interface OcrResult {
  numero: string | null
  emisorReceptor: string | null
  nifContraparte: string | null
  fechaEmision: string | null
  baseImponible: number | null
  iva: number | null
  total: number | null
  tipo: 'ingreso' | 'gasto' | null
}

export async function extractInvoiceData(pdfUrl: string): Promise<OcrResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY no configurada')
  }

  const pdfResponse = await fetch(pdfUrl)
  if (!pdfResponse.ok) {
    throw new Error('No se pudo descargar el PDF')
  }

  const pdfBuffer = await pdfResponse.arrayBuffer()
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: `Extrae los datos de esta factura en español.
Devuelve SOLO un objeto JSON válido sin explicaciones adicionales, con estos campos:
{
  "numero": "número de factura",
  "emisorReceptor": "nombre del emisor o receptor según el contexto",
  "nifContraparte": "NIF/CIF de la otra parte",
  "fechaEmision": "fecha en formato YYYY-MM-DD",
  "baseImponible": 123.45,
  "iva": 21,
  "total": 149.37,
  "tipo": "ingreso" si es una factura emitida, "gasto" si es recibida
}

Si no encuentras un valor, pon null.`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Error al procesar OCR: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta')
    return JSON.parse(jsonMatch[0]) as OcrResult
  } catch {
    throw new Error('No se pudieron extraer los datos de la factura')
  }
}
