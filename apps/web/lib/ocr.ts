import { sugerirModelos } from '@mantigestor/utils'

export interface ModeloSugeridoOcr {
  modelo: string
  razon: string
}

export interface OcrResult {
  numero: string | null
  emisorReceptor: string | null
  nifContraparte: string | null
  fechaEmision: string | null
  baseImponible: number | null
  iva: number | null
  total: number | null
  tipo: 'ingreso' | 'gasto' | null
  categoriaGasto: string | null
  modelosSugeridos: ModeloSugeridoOcr[]
}

/**
 * Solo se permiten URLs del storage de Supabase del propio proyecto (anti-SSRF).
 */
export function esUrlStorageSegura(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return false
  try {
    const u = new URL(url)
    const b = new URL(base)
    return u.origin === b.origin && u.pathname.startsWith('/storage/v1/object/')
  } catch {
    return false
  }
}

export async function extractInvoiceData(pdfUrl: string): Promise<OcrResult> {
  if (!esUrlStorageSegura(pdfUrl)) {
    throw new Error('URL de documento no permitida')
  }

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
  "tipo": "ingreso" si es una factura emitida, "gasto" si es recibida,
  "categoriaGasto": "suministros" | "alquiler" | "nómina" | "seguridad-social" | "marketing" | "seguros" | "profesionales" | "material" | "transporte" | "comunicaciones" | "formación" | "otros" | null,
  "modelosSugeridos": [
    {"modelo": "303", "razon": "IVA repercutido en liquidación trimestral"},
    {"modelo": "130", "razon": "Ingreso en pagos fraccionados IRPF"}
  ]
}

Para categoriaGasto, si es gasto, clasifícalo según el concepto:
- suministros: luz, agua, gas, telefonía, internet
- alquiler: alquiler de local/oficina
- nómina: salarios
- seguridad-social: cuotas SS
- marketing: publicidad, redes sociales
- seguros: pólizas
- profesionales: honorarios abogados, contables, etc.
- material: material de oficina, ordenadores
- transporte: gasolina, parking, transportes
- comunicaciones: teléfono, internet
- formación: cursos, libros
- otros: si no encaja en ninguno

Para modelosSugeridos, incluye SOLO los modelos AEAT realmente afectados por esta factura:
- Toda factura afecta a 303 (IVA) y 390 (resumen anual)
- Si es ingreso/gasto de autónomo, afecta a 130/131 (IRPF trimestral)
- Si el NIF empieza por letras de país UE (DE, FR, IT...), afecta a 349 (intracomunitaria)
- Si IVA es 0% y es intracomunitaria, añadir nota de exenta en 303
- Si parece retención de profesional (ingreso, NIF empresa), sugerir 111

Si no encuentras un valor, pon null. Si no puedes determinar modelos, devuelve un array vacío [].`,
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
    const parsed = JSON.parse(jsonMatch[0]) as OcrResult

    // Si Claude no devolvió modelos, calcular con la util local
    if (!parsed.modelosSugeridos || parsed.modelosSugeridos.length === 0) {
      parsed.modelosSugeridos = sugerirModelos({
        tipo: parsed.tipo,
        iva: parsed.iva,
        baseImponible: parsed.baseImponible,
        nifContraparte: parsed.nifContraparte,
      }).map(m => ({ modelo: m.modelo, razon: m.razon }))
    }

    return parsed
  } catch {
    throw new Error('No se pudieron extraer los datos de la factura')
  }
}
