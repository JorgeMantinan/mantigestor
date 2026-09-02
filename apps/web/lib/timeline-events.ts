'use client'

import { createClient } from '@/lib/supabase/client'

export type TipoEvento =
  | 'creada'
  | 'editada'
  | 'estado_cambiado'
  | 'ocr'
  | 'email'
  | 'pdf_descargada'
  | 'conciliada'
  | 'eliminada'

export interface EventoTimeline {
  id: string
  tipo: TipoEvento
  titulo: string
  detalle: string | null
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  fecha: string
}

interface AuditEntry {
  id: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: string | null
  meta: string | null
  createdAt: string
}

function mapAccionToEvento(entry: AuditEntry): EventoTimeline | null {
  let tipo: TipoEvento
  switch (entry.accion) {
    case 'crear':
      tipo = 'creada'
      break
    case 'editar':
      tipo = 'editada'
      break
    case 'cambio_estado':
      tipo = 'estado_cambiado'
      break
    case 'eliminar':
      tipo = 'eliminada'
      break
    default:
      tipo = entry.accion as TipoEvento
  }

  let antes: Record<string, unknown> | null = null
  let despues: Record<string, unknown> | null = null

  if (entry.meta) {
    try {
      const parsed = JSON.parse(entry.meta) as Record<string, unknown>
      if ('antes' in parsed) antes = parsed['antes'] as Record<string, unknown>
      if ('despues' in parsed) despues = parsed['despues'] as Record<string, unknown>
    } catch {
      // meta is not JSON — skip
    }
  }

  return {
    id: entry.id,
    tipo,
    titulo: entry.detalle ?? entry.accion.replace(/_/g, ' '),
    detalle: null,
    antes,
    despues,
    fecha: entry.createdAt,
  }
}

export async function obtenerEventosTimeline(facturaId: string): Promise<EventoTimeline[]> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id')
    .eq('userId', user.id)
    .single()

  if (!perfil) return []

  const { data: entries } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entidad', 'factura')
    .eq('entidadId', facturaId)
    .order('createdAt', { ascending: false })

  if (!entries || entries.length === 0) return []

  const eventos: EventoTimeline[] = []
  for (const entry of entries as AuditEntry[]) {
    const mapped = mapAccionToEvento(entry)
    if (mapped) eventos.push(mapped)
  }

  return eventos
}
