import type { OcrResult } from './ocr'

export async function parsearVozAFactura(texto: string): Promise<OcrResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY no configurada')
  }

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
          content: `Eres un asistente que extrae datos de facturas a partir de texto hablado en español.
El usuario describe una factura por voz. Analiza el texto y extrae los campos relevantes.

Texto del usuario:
"${texto}"

Devuelve SOLO un objeto JSON válido sin explicaciones, con estos campos:
{
  "numero": "número de factura (string)",
  "emisorReceptor": "nombre de la empresa o persona (string)",
  "nifContraparte": "NIF o CIF si se menciona (string, null si no)",
  "fechaEmision": "fecha en formato YYYY-MM-DD (null si no se menciona)",
  "baseImponible": 123.45 (number, null si no se menciona),
  "iva": 21 (number: 0, 4, 10 o 21 — si no se menciona IVA asume 21),
  "total": 149.37 (number, null si no se menciona),
  "tipo": "gasto" si el usuario dice que es un gasto o lo describe como recibido, "ingreso" si es una factura emitida, null si no se deduce
}

Reglas:
- Interpreta "IVA al veintiuno por ciento" como 21, "al diez" como 10, "al cuatro" como 4, "sin IVA" como 0
- Si el usuario dice "factura de" o "de Google" → emisorReceptor = "Google"
- Si el usuario dice "número 45" o "factura 45" → numero = "45"
- Si el usuario dice "mil euros" → baseImponible = 1000
- Si el usuario dice "quinientos con IVA" → baseImponible = 500
- Si solo da el total sin desglosar, pon total y deja baseImponible null
- Si no entiendes algo, pon null en vez de inventar`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Error al procesar voz: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta')
    return JSON.parse(jsonMatch[0]) as OcrResult
  } catch {
    throw new Error('No se pudieron extraer los datos del audio')
  }
}
