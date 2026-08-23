import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type EscalaIrpf,
  type TramoIrpf,
  type TramoReta,
  type PlazoFiscalEntrada,
  resolverJurisdiccion,
  normalizarTerritorio,
} from '@mantigestor/utils'

export const AVISO_NO_VERIFICADO =
  'Los datos fiscales están pendientes de verificación oficial. No usarlos para presentaciones reales.'

export interface EscalasIrpfResultado {
  regimen: string
  comunidad: string
  estatal: EscalaIrpf | null
  autonomica: EscalaIrpf | null
  avisos: string[]
}

export function eurosACentimos(valor: number): number {
  return Math.round(valor * 100)
}

function decimalANumero(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function aTramosIrpf(filas: Array<Record<string, unknown>>, campoTipo: string): TramoIrpf[] {
  return filas
    .map(f => ({
      tramo: Number(f.tramo ?? 0),
      desdeEur: decimalANumero(f.desdeEur) ?? 0,
      hastaEur: decimalANumero(f.hastaEur),
      tipoPct: decimalANumero(f[campoTipo]),
    }))
    .filter((t): t is TramoIrpf & { tipoPct: number } => t.tipoPct !== null)
    .sort((a, b) => a.desdeEur - b.desdeEur)
}

export async function obtenerEscalaEstatal(
  client: SupabaseClient,
  taxYear: number,
): Promise<{ escala: EscalaIrpf | null; avisos: string[] }> {
  const { data, error } = await client
    .from('irpf_tramos_estatales')
    .select('tramo, desdeEur, hastaEur, tipoEstatalPct, taxYear, status')
    .eq('taxYear', taxYear)
    .order('desdeEur')

  if (error) throw error
  if (!data?.length) return { escala: null, avisos: [`No hay escala estatal IRPF para el año ${taxYear}`] }

  const avisos = data.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []
  return {
    escala: {
      ambito: 'ESTATAL',
      comunidad: null,
      taxYear,
      tramos: aTramosIrpf(data as Array<Record<string, unknown>>, 'tipoEstatalPct'),
    },
    avisos,
  }
}

export async function obtenerEscalasIrpf(
  client: SupabaseClient,
  comunidadEntrada: string,
  taxYear: number,
): Promise<EscalasIrpfResultado> {
  const jurisdiccion = resolverJurisdiccion(comunidadEntrada)
  const avisos: string[] = []

  const [estatalRes, autRes] = await Promise.all([
    obtenerEscalaEstatal(client, taxYear),
    client
      .from('irpf_tramos_autonomicos')
      .select('comunidad, tramo, desdeEur, hastaEur, tipoAutonomicoPct, regimen, status')
      .eq('taxYear', taxYear)
      .order('desdeEur'),
  ])

  if (estatalRes.escala) avisos.push(...estatalRes.avisos)

  let autonomica: EscalaIrpf | null = null
  if (!jurisdiccion.usaEscalaComun) {
    avisos.push(
      `${jurisdiccion.regimen}: territorio foral con escala propia no incluida todavía en la base de datos.`,
    )
  } else {
    const filas = (autRes.data ?? []).filter(
      f =>
        normalizarTerritorio(String(f.comunidad)) === jurisdiccion.nombreNormalizado &&
        Number(f.tramo) > 0
    )
    const tramos = aTramosIrpf(filas as Array<Record<string, unknown>>, 'tipoAutonomicoPct')
    if (!filas.length) {
      avisos.push(`No hay escala autonómica de IRPF para "${comunidadEntrada}" en ${taxYear}`)
    } else {
      if (filas.some(f => f.status !== 'OFFICIAL_VERIFIED')) avisos.push(AVISO_NO_VERIFICADO)
      autonomica = { ambito: 'AUTONOMICO', comunidad: String(filas[0]?.comunidad), taxYear, tramos }
    }
  }

  return {
    regimen: jurisdiccion.regimen,
    comunidad: comunidadEntrada,
    estatal: estatalRes.escala,
    autonomica,
    avisos,
  }
}

export async function obtenerTramosReta(
  client: SupabaseClient,
  taxYear: number,
): Promise<{ tramos: TramoReta[]; avisos: string[] }> {
  const { data, error } = await client
    .from('reta_tramos')
    .select('tabla, tramo, rendimientoNetoDesde, rendimientoNetoHasta, baseMinimaEur, baseMaximaEur, cuotaMinimaRefEur, taxYear, status')
    .eq('taxYear', taxYear)
    .order('rendimientoNetoDesde')

  if (error) throw error
  if (!data?.length) return { tramos: [], avisos: [`No hay tramos RETA para el año ${taxYear}`] }

  const avisos = data.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []
  const tramos: TramoReta[] = data.map(f => ({
    tabla: String(f.tabla),
    tramo: Number(f.tramo),
    rendimientoNetoDesdeEur: decimalANumero(f.rendimientoNetoDesde) ?? 0,
    rendimientoNetoHastaEur: decimalANumero(f.rendimientoNetoHasta),
    baseMinimaEur: decimalANumero(f.baseMinimaEur) ?? 0,
    baseMaximaEur: decimalANumero(f.baseMaximaEur),
    cuotaMinimaRefEur: decimalANumero(f.cuotaMinimaRefEur),
  }))

  return { tramos, avisos }
}

export async function obtenerProximosPlazosFiscales(
  client: SupabaseClient,
  hoy: Date,
): Promise<PlazoFiscalEntrada[]> {
  const { data, error } = await client
    .from('deadlines')
    .select('id, modeloNumero, periodo, fechaLimiteReferencia, status')
    .not('fechaLimiteReferencia', 'is', null)
    .order('fechaLimiteReferencia')

  if (error) throw error

  return (data ?? []).map(f => ({
    id: String(f.id),
    modeloNumero: f.modeloNumero ?? null,
    periodo: String(f.periodo),
    fechaLimiteReferencia: new Date(String(f.fechaLimiteReferencia)),
    status: String(f.status),
  }))
}

export interface ReglaIva {
  tipo: string
  ratePct: number
  productCategory: string | null
  ejemplos: string | null
}

export async function obtenerReglasIva(client: SupabaseClient, taxYear: number): Promise<ReglaIva[]> {
  const { data, error } = await client
    .from('vat_rules')
    .select('tipo, ratePct, productCategory, ejemplos')
    .eq('taxYear', taxYear)
    .order('ratePct', { ascending: false })

  if (error) throw error
  return (data ?? []).map(f => ({
    tipo: String(f.tipo),
    ratePct: decimalANumero(f.ratePct) ?? 0,
    productCategory: f.productCategory ? String(f.productCategory) : null,
    ejemplos: f.ejemplos ? String(f.ejemplos) : null,
  }))
}

export interface TipoIs {
  tipoEntidad: string
  requisitoFacturacion: string | null
  tipoPct: number
  taxYear: number
  previsto: boolean
  notas: string | null
}

export async function obtenerTiposIs(client: SupabaseClient): Promise<TipoIs[]> {
  const { data, error } = await client
    .from('is_tipos')
    .select('tipoEntidad, requisitoFacturacion, tipoPct, taxYear, previsto, notas')
    .order('taxYear')

  if (error) throw error
  return (data ?? []).map(f => ({
    tipoEntidad: String(f.tipoEntidad),
    requisitoFacturacion: f.requisitoFacturacion ? String(f.requisitoFacturacion) : null,
    tipoPct: decimalANumero(f.tipoPct) ?? 0,
    taxYear: Number(f.taxYear),
    previsto: Boolean(f.previsto),
    notas: f.notas ? String(f.notas) : null,
  }))
}

export async function obtenerEscalaPatrimonio(
  client: SupabaseClient,
  taxYear: number,
): Promise<TramoIrpf[]> {
  const { data, error } = await client
    .from('patrimonio_escala_estatal')
    .select('tramo, desdeEur, hastaEur, tipoPct')
    .eq('taxYear', taxYear)
    .order('desdeEur')

  if (error) throw error
  return aTramosIrpf((data ?? []) as Array<Record<string, unknown>>, 'tipoPct')
}

export interface MinimoFamiliar {
  territorio: string
  concepto: string
  importeEur: number
  notas: string | null
}

export async function obtenerMinimos(
  client: SupabaseClient,
  taxYear: number,
): Promise<MinimoFamiliar[]> {
  const { data, error } = await client
    .from('minimo_personal_familiar')
    .select('territorio, concepto, importeEur, notas')
    .eq('taxYear', taxYear)
    .order('territorio')

  if (error) throw error
  return (data ?? []).map(f => ({
    territorio: String(f.territorio),
    concepto: String(f.concepto),
    importeEur: decimalANumero(f.importeEur) ?? 0,
    notas: f.notas ? String(f.notas) : null,
  }))
}

export interface ReduccionIrpf {
  concepto: string
  formulaTexto: string | null
  condiciones: string | null
  notas: string | null
}

export async function obtenerReducciones(
  client: SupabaseClient,
  taxYear: number,
): Promise<ReduccionIrpf[]> {
  const { data, error } = await client
    .from('reducciones_generales_irpf')
    .select('concepto, formulaTexto, condiciones, notas')
    .eq('taxYear', taxYear)

  if (error) throw error
  return (data ?? []).map(f => ({
    concepto: String(f.concepto),
    formulaTexto: f.formulaTexto ? String(f.formulaTexto) : null,
    condiciones: f.condiciones ? String(f.condiciones) : null,
    notas: f.notas ? String(f.notas) : null,
  }))
}
