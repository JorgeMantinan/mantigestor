import { createClient } from '@/lib/supabase/client'

export type TipoRectificativa = 'credito' | 'debito'

export interface RectificativaData {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
  notas: string | null
  tags: string | null
  perfilId: string
  createdAt: string
}

export interface FacturaOriginal {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  iva: number
  total: number
  estado: string
}

function getSupabase() {
  return createClient()
}

function generarNumeroRectificativa(numeroOriginal: string): string {
  return `R-${numeroOriginal}`
}

function calcularImporteMaximo(baseImponible: number, iva: number): number {
  const ivaImporte = Math.round(baseImponible * (iva / 100))
  return baseImponible + ivaImporte
}

export { calcularImporteMaximo }

export async function crearRectificativa(
  perfilId: string,
  facturaOriginal: FacturaOriginal,
  tipoRectificativa: TipoRectificativa,
  motivo: string,
  baseImponibleRectificada: number,
  ivaPorcentaje: number
): Promise<{ ok: boolean; data?: RectificativaData; error?: string }> {
  try {
    const ivaImporte = Math.round(baseImponibleRectificada * (ivaPorcentaje / 100))
    const total = baseImponibleRectificada + ivaImporte

    const notas = [
      `NOTA DE ${tipoRectificativa === 'credito' ? 'CRÉDITO' : 'DÉBITO'}`,
      `Factura original: ${facturaOriginal.numero}`,
      `Motivo: ${motivo}`,
    ].join(' | ')

    const numero = generarNumeroRectificativa(facturaOriginal.numero)

    const { data, error } = await getSupabase()
      .from('facturas')
      .insert({
        id: crypto.randomUUID(),
        perfilId,
        numero,
        tipo: 'rectificativa',
        emisorReceptor: facturaOriginal.emisorReceptor,
        nifContraparte: facturaOriginal.nifContraparte,
        fechaEmision: new Date().toISOString(),
        fechaVencimiento: null,
        baseImponible: baseImponibleRectificada,
        iva: ivaPorcentaje,
        total,
        estado: 'pagada',
        categoriaGasto: null,
        notas,
        tags: `rectificativa,${tipoRectificativa === 'credito' ? 'nota-credito' : 'nota-debito'},original:${facturaOriginal.numero}`,
        pdfUrl: null,
        moneda: 'EUR',
        tipoCambio: 1,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating rectificativa:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, data: data as RectificativaData }
  } catch (err) {
    console.error('Unexpected error creating rectificativa:', err)
    return { ok: false, error: 'Error inesperado al crear la rectificativa' }
  }
}

export async function obtenerRectificativas(
  perfilId: string,
  facturaNumero: string
): Promise<{ ok: boolean; data?: RectificativaData[]; error?: string }> {
  try {
    const { data, error } = await getSupabase()
      .from('facturas')
      .select('*')
      .eq('perfilId', perfilId)
      .eq('tipo', 'rectificativa')
      .like('tags', `%original:${facturaNumero}%`)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching rectificativas:', error)
      return { ok: false, error: error.message }
    }

    return { ok: true, data: (data as RectificativaData[]) ?? [] }
  } catch (err) {
    console.error('Unexpected error fetching rectificativas:', err)
    return { ok: false, error: 'Error inesperado al obtener rectificativas' }
  }
}

export function esRectificativa(tipo: string): boolean {
  return tipo === 'rectificativa'
}

export function esNotaCredito(tags: string | null): boolean {
  return tags?.includes('nota-credito') ?? false
}

export function esNotaDebito(tags: string | null): boolean {
  return tags?.includes('nota-debito') ?? false
}

export function obtenerFacturaOriginalNumero(notas: string | null): string | null {
  if (!notas) return null
  const match = notas.match(/Factura original: (.+?)(?:\s*\||$)/)
  return match?.[1]?.trim() ?? null
}

export function obtenerMotivoRectificativa(notas: string | null): string | null {
  if (!notas) return null
  const match = notas.match(/Motivo: (.+?)(?:\s*\||$)/)
  return match?.[1]?.trim() ?? null
}
