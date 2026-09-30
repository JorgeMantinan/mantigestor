import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MODELOS_TRIMESTRALES,
  generarModelosTrimestrales,
  type FacturaGeneradora,
  type ModeloGenerado,
  type NominaGeneradora,
  type Trimestre,
} from './generador-modelos'

export interface ModeloGeneradoFila {
  id: string
  perfilId: string
  modelo: string
  titulo: string
  periodicidad: string
  trimestre: number
  anyo: number
  fingerprint: string
  totalCents: number
  datos: Record<string, number>
  estado: string
  generadoEn: string
}

interface FilaCruda {
  id: string
  perfilId: string
  modelo: string
  titulo: string | null
  periodicidad: string
  trimestre: number
  anyo: number
  fingerprint: string
  totalCents: number | null
  datos: Record<string, number> | null
  estado: string
  generadoEn: string
}

function aFila(f: FilaCruda): ModeloGeneradoFila {
  return {
    id: f.id,
    perfilId: f.perfilId,
    modelo: f.modelo,
    titulo: f.titulo ?? '',
    periodicidad: f.periodicidad,
    trimestre: f.trimestre,
    anyo: f.anyo,
    fingerprint: f.fingerprint,
    totalCents: f.totalCents ?? 0,
    datos: f.datos ?? {},
    estado: f.estado,
    generadoEn: f.generadoEn,
  }
}

/** Lista los modelos almacenados de un periodo (sin generar nada nuevo) */
export async function listarModelosPeriodo(
  supabase: SupabaseClient,
  perfilId: string,
  anyo: number,
  trimestre: Trimestre
): Promise<ModeloGeneradoFila[]> {
  const { data, error } = await supabase
    .from('modelos_generados')
    .select('*')
    .eq('perfilId', perfilId)
    .eq('anyo', anyo)
    .eq('trimestre', trimestre)
    .in('modelo', [...MODELOS_TRIMESTRALES])
    .order('modelo')

  if (error) {
    console.error('Error listando modelos generados:', error)
    return []
  }
  return ((data ?? []) as unknown as FilaCruda[]).map(aFila)
}

/**
 * Recalcula los modelos de un periodo desde los datos reales de la BD y los
 * guarda: borra los anteriores del periodo y registra los nuevos (regeneración).
 * Si ninguna huella ha cambiado, no escribe nada y devuelve los existentes.
 */
export async function regenerarModelosPeriodo(
  supabase: SupabaseClient,
  perfilId: string,
  anyo: number,
  trimestre: Trimestre
): Promise<{ modelos: ModeloGeneradoFila[]; regenerado: boolean }> {
  const desde = `${anyo}-01-01`
  const hasta = `${anyo + 1}-01-01`

  const [facturasRes, nominasRes, existentesRes] = await Promise.all([
    supabase
      .from('facturas')
      .select('*')
      .eq('perfilId', perfilId)
      .gte('fechaEmision', desde)
      .lt('fechaEmision', hasta),
    supabase
      .from('nominas')
      .select('*')
      .eq('perfilId', perfilId)
      .eq('anyo', anyo),
    supabase
      .from('modelos_generados')
      .select('*')
      .eq('perfilId', perfilId)
      .eq('anyo', anyo)
      .eq('trimestre', trimestre)
      .in('modelo', [...MODELOS_TRIMESTRALES]),
  ])

  if (facturasRes.error) {
    console.error('Error leyendo facturas para regenerar modelos:', facturasRes.error)
    throw new Error(facturasRes.error.message)
  }
  if (nominasRes.error) {
    console.error('Error leyendo nóminas para regenerar modelos:', nominasRes.error)
    throw new Error(nominasRes.error.message)
  }
  if (existentesRes.error) {
    console.error('Error leyendo modelos existentes:', existentesRes.error)
    throw new Error(existentesRes.error.message)
  }

  const facturas = (facturasRes.data ?? []) as unknown as FacturaGeneradora[]
  const nominas = (nominasRes.data ?? []) as unknown as NominaGeneradora[]
  const existentes = ((existentesRes.data ?? []) as unknown as FilaCruda[]).map(aFila)

  const generados: ModeloGenerado[] = generarModelosTrimestrales({ anyo, trimestre, facturas, nominas })

  const sinCambios =
    generados.length === existentes.length &&
    generados.every(g => existentes.some(e => e.modelo === g.modelo && e.fingerprint === g.fingerprint))

  if (sinCambios) {
    return { modelos: existentes.sort((a, b) => a.modelo.localeCompare(b.modelo)), regenerado: false }
  }

  const { error: deleteError } = await supabase
    .from('modelos_generados')
    .delete()
    .eq('perfilId', perfilId)
    .eq('anyo', anyo)
    .eq('trimestre', trimestre)
    .in('modelo', [...MODELOS_TRIMESTRALES])

  if (deleteError) {
    console.error('Error borrando modelos anteriores:', deleteError)
    throw new Error(deleteError.message)
  }

  if (generados.length > 0) {
    const ahora = new Date().toISOString()
    const filas = generados.map(g => ({
      id: crypto.randomUUID(),
      perfilId,
      modelo: g.modelo,
      titulo: g.titulo,
      periodicidad: g.periodicidad,
      trimestre: g.trimestre,
      anyo: g.anyo,
      fingerprint: g.fingerprint,
      totalCents: g.totalCents,
      datos: g.datos,
      estado: 'borrador',
      generadoEn: ahora,
    }))

    const { error: insertError } = await supabase.from('modelos_generados').insert(filas)
    if (insertError) {
      console.error('Error insertando modelos generados:', insertError)
      throw new Error(insertError.message)
    }
  }

  const modelos = await listarModelosPeriodo(supabase, perfilId, anyo, trimestre)
  return { modelos, regenerado: true }
}

/**
 * Regenera los modelos del periodo al que pertenece una fecha.
 * Pensado para engancharse a mutaciones de facturas: nunca lanza excepciones
 * para no romper la operación principal.
 */
export async function regenerarModelosDeFecha(
  supabase: SupabaseClient,
  perfilId: string,
  fechaIso: string
): Promise<void> {
  try {
    const fecha = new Date(fechaIso)
    if (Number.isNaN(fecha.getTime())) return
    const mes = fecha.getMonth() + 1
    const trimestre = (Math.min(4, Math.max(1, Math.ceil(mes / 3))) as Trimestre)
    await regenerarModelosPeriodo(supabase, perfilId, fecha.getFullYear(), trimestre)
  } catch (e) {
    console.error('Error regenerando modelos tras cambio de factura:', e)
  }
}
