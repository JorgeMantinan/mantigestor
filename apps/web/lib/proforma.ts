import { createClient } from '@/lib/supabase/client'

export type ProformaEstado = 'borrador' | 'enviada' | 'aceptada' | 'rechazada'

export interface Proforma {
  id: string
  perfilId: string
  numero: string
  tipo: 'proforma'
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  fechaVencimiento: string | null
  baseImponible: number
  iva: number
  total: number
  estado: ProformaEstado
  notas: string | null
  moneda: string
  tipoCambio: number
  createdAt: string
}

export const COLOR_ESTADO_PROFORMA: Record<ProformaEstado, string> = {
  borrador: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  enviada: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  aceptada: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rechazada: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export const ESTADOS_PROFORMA: ProformaEstado[] = ['borrador', 'enviada', 'aceptada', 'rechazada']

function getSupabase() {
  return createClient()
}

export async function listarProformas(perfilId: string): Promise<Proforma[]> {
  const { data, error } = await getSupabase()
    .from('facturas')
    .select('*')
    .eq('perfilId', perfilId)
    .eq('tipo', 'proforma')
    .order('createdAt', { ascending: false })

  if (error) throw error
  return (data ?? []) as Proforma[]
}

export async function crearProforma(data: {
  perfilId: string
  numero: string
  emisorReceptor: string
  nifContraparte?: string | null
  fechaEmision: string
  fechaValidez?: string | null
  baseImponible: number
  iva: number
  notasProforma?: string | null
  moneda?: string
  tipoCambio?: number
}): Promise<Proforma> {
  const total = data.baseImponible + Math.round(data.baseImponible * (data.iva / 100))

  const { data: result, error } = await getSupabase()
    .from('facturas')
    .insert({
      id: crypto.randomUUID(),
      perfilId: data.perfilId,
      numero: data.numero,
      tipo: 'proforma',
      emisorReceptor: data.emisorReceptor,
      nifContraparte: data.nifContraparte ?? null,
      fechaEmision: data.fechaEmision,
      fechaVencimiento: data.fechaValidez ?? null,
      baseImponible: data.baseImponible,
      iva: data.iva,
      total,
      estado: 'borrador',
      notas: data.notasProforma ?? null,
      moneda: data.moneda ?? 'EUR',
      tipoCambio: data.tipoCambio ?? 1,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return result as Proforma
}

export async function actualizarEstadoProforma(
  proformaId: string,
  nuevoEstado: ProformaEstado
): Promise<void> {
  const { error } = await getSupabase()
    .from('facturas')
    .update({ estado: nuevoEstado })
    .eq('id', proformaId)
    .eq('tipo', 'proforma')

  if (error) throw error
}

export async function eliminarProforma(proformaId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('facturas')
    .delete()
    .eq('id', proformaId)
    .eq('tipo', 'proforma')

  if (error) throw error
}

export async function convertirAFactura(proformaId: string): Promise<string> {
  const { data: proforma, error: fetchError } = await getSupabase()
    .from('facturas')
    .select('*')
    .eq('id', proformaId)
    .eq('tipo', 'proforma')
    .single()

  if (fetchError || !proforma) throw new Error('Proforma no encontrada')

  const nuevaFacturaId = crypto.randomUUID()

  const { error: insertError } = await getSupabase()
    .from('facturas')
    .insert({
      id: nuevaFacturaId,
      perfilId: proforma.perfilId,
      numero: proforma.numero,
      tipo: 'ingreso',
      emisorReceptor: proforma.emisorReceptor,
      nifContraparte: proforma.nifContraparte,
      fechaEmision: proforma.fechaEmision,
      fechaVencimiento: proforma.fechaVencimiento,
      baseImponible: proforma.baseImponible,
      iva: proforma.iva,
      total: proforma.total,
      estado: 'pendiente',
      notas: proforma.notas,
      moneda: proforma.moneda,
      tipoCambio: proforma.tipoCambio,
      createdAt: new Date().toISOString(),
    })

  if (insertError) throw insertError

  const { error: updateError } = await getSupabase()
    .from('facturas')
    .update({ estado: 'aceptada' })
    .eq('id', proformaId)

  if (updateError) throw updateError

  return nuevaFacturaId
}

export async function duplicarProforma(proformaId: string): Promise<Proforma> {
  const { data: original, error: fetchError } = await getSupabase()
    .from('facturas')
    .select('*')
    .eq('id', proformaId)
    .eq('tipo', 'proforma')
    .single()

  if (fetchError || !original) throw new Error('Proforma no encontrada')

  const { data: duplicada, error: insertError } = await getSupabase()
    .from('facturas')
    .insert({
      id: crypto.randomUUID(),
      perfilId: original.perfilId,
      numero: `${original.numero}-copia`,
      tipo: 'proforma',
      emisorReceptor: original.emisorReceptor,
      nifContraparte: original.nifContraparte,
      fechaEmision: new Date().toISOString().slice(0, 10),
      fechaVencimiento: original.fechaVencimiento,
      baseImponible: original.baseImponible,
      iva: original.iva,
      total: original.total,
      estado: 'borrador',
      notas: original.notas,
      moneda: original.moneda,
      tipoCambio: original.tipoCambio,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError) throw insertError
  return duplicada as Proforma
}
