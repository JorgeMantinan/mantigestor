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

// ─────────────────────────────────────────────────────────────
// OCR sin IA: Tesseract.js (imágenes) y pdf-parse (PDF), con
// parser heurístico en español para tickets y facturas.
// ─────────────────────────────────────────────────────────────

let workerPromise: Promise<import('tesseract.js').Worker> | null = null

async function obtenerWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      // Worker en español reutilizado entre invocaciones (calentamiento del lambda)
      return createWorker('spa')
    })()
    workerPromise.catch(() => {
      workerPromise = null // si falla (p.ej. red), se reintenta en la siguiente llamada
    })
  }
  return workerPromise
}

/** Extrae texto de una imagen (data URL o base64) con OCR tradicional. */
export async function extraerTextoImagen(imagen: string): Promise<string> {
  const worker = await obtenerWorker()
  let entrada: Buffer
  const base64 = imagen.startsWith('data:') ? (imagen.split(',')[1] ?? '') : imagen
  try {
    // Preprocesado: escala de grises, normalización de contraste y enfoque —
    // mejora mucho la lectura de tickets térmicos (tinta desvaída, poco contraste).
    const sharp = (await import('sharp')).default
    entrada = await sharp(Buffer.from(base64, 'base64'))
      .grayscale()
      .normalise()
      .sharpen()
      .png()
      .toBuffer()
  } catch {
    entrada = Buffer.from(base64, 'base64') // si sharp falla, OCR sobre la original
  }
  const { data } = await worker.recognize(entrada)
  return data.text ?? ''
}

/** Extrae texto de un PDF (almacenado en Supabase Storage) sin IA. */
export async function extraerTextoPdf(pdfUrl: string): Promise<string> {
  if (!esUrlStorageSegura(pdfUrl)) {
    throw new Error('URL de documento no permitida')
  }
  const res = await fetch(pdfUrl)
  if (!res.ok) throw new Error('No se pudo descargar el documento')
  const buffer = Buffer.from(await res.arrayBuffer())
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return result?.text ?? ''
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

// ── Parser heurístico (es) ──

/** Importes en formato español (1.234,56) o inglés (1,234.56) */
function aEuro(texto: string): number | null {
  const limpio = texto.replace(/[^\d.,-]/g, '')
  if (!limpio) return null
  let normal = limpio
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(limpio)) normal = limpio.replace(/\./g, '').replace(',', '.')
  else normal = limpio.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = parseFloat(normal)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function numerosDe(linea: string): number[] {
  const re = /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?/g
  const out: number[] = []
  for (const m of linea.match(re) ?? []) {
    const v = aEuro(m)
    if (v !== null) out.push(v)
  }
  return out
}

/**
 * Parsea el texto OCR de un ticket/factura y devuelve los datos en euros.
 * Es best-effort: lo que no se encuentre queda en null y el usuario lo
 * corrige en la vista previa.
 */
export function parseTextoTicket(texto: string, tipoPorDefecto: 'ingreso' | 'gasto' = 'gasto'): OcrResult {
  const lineas = texto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  // ── Total: preferimos líneas que empiezan por "total"; si no, cualquier "total"
  let total: number | null = null
  const lineasTotal = lineas.filter(l => /^\s*(import[eé]\s*total|total)\b/i.test(l))
  const candidatosTotal = lineasTotal.length > 0 ? lineasTotal : lineas.filter(l => /\btotal\b/i.test(l))
  for (const l of candidatosTotal) {
    const candidatos = numerosDe(l)
    if (candidatos.length > 0) {
      const max = Math.max(...candidatos)
      if (total === null || max > total) total = max
    }
  }

  // ── Base imponible directa (si la factura la incluye explícita)
  let baseDirecta: number | null = null
  for (const l of lineas) {
    if (!/base\s*imponible|base\s*impon/i.test(l)) continue
    const nums = numerosDe(l)
    if (nums.length > 0) baseDirecta = Math.max(...nums)
  }

  // ── IVA: porcentaje e importe
  let ivaPorcentaje: number | null = null
  let ivaImporte: number | null = null
  for (const l of lineas) {
    if (!/\biva\b|\bimp\.?\s*valor\s*a[nñ]adido\b/i.test(l)) continue
    const pctMatch = l.match(/(\d{1,2})(?:[.,](\d))?\s*%/)
    const nums = numerosDe(l)
    if (pctMatch) {
      const pct = parseFloat(pctMatch[0].replace('%', '').replace(',', '.'))
      if (pct <= 30) ivaPorcentaje = pct
      const otros = nums.filter(n => Math.abs(n - pct) > 0.01)
      if (otros.length > 0 && ivaImporte === null) ivaImporte = Math.max(...otros)
    } else if (nums.length > 0 && ivaImporte === null) {
      ivaImporte = Math.max(...nums)
    }
    if (ivaPorcentaje !== null && ivaImporte !== null) break
  }
  if (ivaPorcentaje !== null && ivaPorcentaje > 30) ivaPorcentaje = null

  // ── Base imponible
  let base: number | null = null
  if (baseDirecta !== null && (total === null || baseDirecta <= total)) {
    base = baseDirecta
    if (total !== null && ivaImporte === null) ivaImporte = Math.round((total - base) * 100) / 100
  } else if (total !== null && ivaImporte !== null && ivaImporte < total) {
    base = Math.round((total - ivaImporte) * 100) / 100
  } else if (total !== null && ivaPorcentaje !== null) {
    base = Math.round((total / (1 + ivaPorcentaje / 100)) * 100) / 100
    if (ivaImporte === null) ivaImporte = Math.round((total - base) * 100) / 100
  }

  // ── Fecha (dd/mm/aaaa o dd-mm-aaaa)
  let fecha: string | null = null
  for (const l of lineas) {
    const m = l.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/)
    if (!m) continue
    const dia = parseInt(m[1] ?? '', 10)
    const mes = parseInt(m[2] ?? '', 10)
    let anio = parseInt(m[3] ?? '', 10)
    if (anio < 100) anio += 2000
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && anio >= 2000 && anio <= 2100) {
      fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      break
    }
  }

  // ── NIF/CIF
  let nif: string | null = null
  for (const l of lineas) {
    const m = l.match(/\b(?:NIF|C\.?I\.?F\.?|F\.?\s*C\.?I\.?F?\.?)\s*[:.\s-]*([A-Za-z0-9-]{8,10})\b/i)
    const nifCapturado = m?.[1]
    if (nifCapturado) {
      nif = nifCapturado.toUpperCase()
      break
    }
  }

  // ── Número de documento
  let numero: string | null = null
  for (const l of lineas) {
    const m = l.match(/\b(?:factura|n[ºo°]|n[uú]mero|ticket|albar[aá]n|documento)\s*[:ºn.\s-]*([A-Za-z][\w./-]*\d[\w./-]*)/i)
    const numeroCapturado = m?.[1]
    if (numeroCapturado) {
      numero = numeroCapturado
      break
    }
  }

  // ── Proveedor / emisor (primera línea con letras que no sea ruido)
  let proveedor: string | null = null
  for (const l of lineas.slice(0, 8)) {
    const limpio = l.replace(/[*#°•|_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (limpio.length < 4) continue
    if (/^\d[\d\s.,/:-]*$/.test(limpio)) continue
    if (/(total|iva|ticket|factura|nif|c\.?i\.?f|tel[eé]fono|direcci[oó]n|www\.|http)/i.test(limpio)) continue
    if ((limpio.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length < 3) continue
    proveedor = limpio
    break
  }

  const iva = ivaPorcentaje !== null && [0, 4, 10, 21].includes(ivaPorcentaje) ? ivaPorcentaje : null
  const baseFinal = base !== null ? Math.round(base * 100) / 100 : null
  const totalFinal = total !== null ? Math.round(total * 100) / 100 : null
  const _ivaFinal = ivaImporte !== null ? Math.round(ivaImporte * 100) / 100 : null

  const modelos = sugerirModelos({
    tipo: tipoPorDefecto,
    iva: iva,
    baseImponible: baseFinal,
    nifContraparte: nif,
  }).map(m => ({ modelo: m.modelo, razon: m.razon }))

  return {
    numero,
    emisorReceptor: proveedor,
    nifContraparte: nif,
    fechaEmision: fecha,
    baseImponible: baseFinal,
    iva,
    total: totalFinal,
    tipo: tipoPorDefecto,
    categoriaGasto: null,
    modelosSugeridos: modelos,
  }
}

/** OCR de un PDF de Storage: descarga, extrae texto y parsea (sin IA). */
export async function extractInvoiceData(pdfUrl: string): Promise<OcrResult> {
  const texto = await extraerTextoPdf(pdfUrl)
  return parseTextoTicket(texto)
}
