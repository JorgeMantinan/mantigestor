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

export async function obtenerEscalaAhorroForal(
  client: SupabaseClient,
  comunidadEntrada: string,
  taxYear: number,
): Promise<{ escala: EscalaIrpf | null; avisos: string[] }> {
  const jurisdiccion = resolverJurisdiccion(comunidadEntrada)
  if (jurisdiccion.usaEscalaComun) return { escala: null, avisos: [] }

  const { data, error } = await client
    .from('irpf_tramos_ahorro')
    .select('territorio, tramo, desdeEur, hastaEur, tipoPct, status')
    .eq('taxYear', taxYear)
    .order('desdeEur')

  if (error) throw error
  const filas = ((data ?? []) as Array<Record<string, unknown>>).filter(
    f =>
      coincideTerritorio(String(f.territorio), jurisdiccion.nombreNormalizado) &&
      Number(f.tramo) > 0,
  )
  if (!filas.length) {
    return {
      escala: null,
      avisos: [
        `${jurisdiccion.regimen}: territorio foral con escala del ahorro propia no incluida todavía en la base de datos.`,
      ],
    }
  }
  const avisos = filas.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []
  return {
    escala: {
      ambito: 'AUTONOMICO',
      comunidad: String(filas[0]?.territorio),
      taxYear,
      tramos: aTramosIrpf(filas, 'tipoPct'),
    },
    avisos,
  }
}

export function eurosACentimos(valor: number): number {
  return Math.round(valor * 100)
}

function decimalANumero(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function coincideTerritorio(nombreDb: string, objetivo: string): boolean {
  const palabrasA = normalizarTerritorio(nombreDb).split(/[^a-z0-9]+/).filter(Boolean)
  const palabrasB = normalizarTerritorio(objetivo).split(/[^a-z0-9]+/).filter(Boolean)
  if (!palabrasA.length || !palabrasB.length) return false
  const [cortas, largas] =
    palabrasA.length <= palabrasB.length ? [palabrasA, palabrasB] : [palabrasB, palabrasA]
  const disponibles = new Set(largas)
  return cortas.every(p => disponibles.has(p))
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
  let estatal = estatalRes.escala
  const filas = (autRes.data ?? []).filter(
    f =>
      coincideTerritorio(String(f.comunidad), jurisdiccion.nombreNormalizado) &&
      Number(f.tramo) > 0
  )
  if (!jurisdiccion.usaEscalaComun && !filas.length) {
    avisos.push(
      `${jurisdiccion.regimen}: territorio foral con escala propia no incluida todavía en la base de datos.`,
    )
  } else {
    const tramos = aTramosIrpf(filas as Array<Record<string, unknown>>, 'tipoAutonomicoPct')
    if (!filas.length) {
      avisos.push(`No hay escala autonómica de IRPF para "${comunidadEntrada}" en ${taxYear}`)
    } else {
      if (filas.some(f => f.status !== 'OFFICIAL_VERIFIED')) avisos.push(AVISO_NO_VERIFICADO)
      autonomica = { ambito: 'AUTONOMICO', comunidad: String(filas[0]?.comunidad), taxYear, tramos }
      if (!jurisdiccion.usaEscalaComun) {
        estatal = null
        avisos.push(
          `${jurisdiccion.regimen}: régimen foral — la escala indicada es la tarifa íntegra del territorio y NO se suma a la estatal.`,
        )
      }
    }
  }

  return {
    regimen: jurisdiccion.regimen,
    comunidad: comunidadEntrada,
    estatal,
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

export async function obtenerCotizacionReta(
  client: SupabaseClient,
  taxYear: number,
): Promise<{ porcentaje: number | null; avisos: string[] }> {
  const { data, error } = await client
    .from('cotizaciones_seg_social')
    .select('pctTotal, status')
    .eq('regimen', 'RETA (autónomos)')
    .eq('concepto', 'TOTAL cotización RETA')
    .eq('taxYear', taxYear)
    .single()

  if (error || !data) return { porcentaje: null, avisos: [`No hay cotización RETA para el año ${taxYear}`] }
  const porcentaje = data.pctTotal != null ? Number(data.pctTotal) : null
  const avisos = data.status !== 'OFFICIAL_VERIFIED' ? [AVISO_NO_VERIFICADO] : []
  return { porcentaje, avisos }
}

export interface DeduccionAutonomica {
  id: string
  comunidad: string
  tipo: string
  descripcion: string
  importeBaseCents: number | null
  porcentaje: number | null
  importeMaxCents: number | null
  rentaMinimaCents: number | null
  rentaMaximaCents: number | null
  duplicable: boolean
  periodoAplicacion: string | null
  notas: string | null
  status: string
}

export async function obtenerDeduccionesAutonomicas(
  client: SupabaseClient,
  comunidad: string,
  taxYear: number,
): Promise<{ deducciones: DeduccionAutonomica[]; avisos: string[] }> {
  const { data, error } = await client
    .from('deducciones_autonomicas')
    .select('id, comunidad, tipo, descripcion, importeBaseCents, porcentaje, importeMaxCents, rentaMinimaCents, rentaMaximaCents, duplicable, periodoAplicacion, notas, status')
    .eq('taxYear', taxYear)
    .eq('comunidad', comunidad)
    .order('tipo')

  if (error) throw error
  if (!data?.length) return { deducciones: [], avisos: [`No hay deducciones autonómicas para ${comunidad} en ${taxYear}`] }

  const avisos = data.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []
  const deducciones: DeduccionAutonomica[] = data.map(f => ({
    id: String(f.id),
    comunidad: String(f.comunidad),
    tipo: String(f.tipo),
    descripcion: String(f.descripcion),
    importeBaseCents: f.importeBaseCents != null ? Number(f.importeBaseCents) : null,
    porcentaje: f.porcentaje != null ? Number(f.porcentaje) : null,
    importeMaxCents: f.importeMaxCents != null ? Number(f.importeMaxCents) : null,
    rentaMinimaCents: f.rentaMinimaCents != null ? Number(f.rentaMinimaCents) : null,
    rentaMaximaCents: f.rentaMaximaCents != null ? Number(f.rentaMaximaCents) : null,
    duplicable: Boolean(f.duplicable),
    periodoAplicacion: f.periodoAplicacion != null ? String(f.periodoAplicacion) : null,
    notas: f.notas != null ? String(f.notas) : null,
    status: String(f.status),
  }))

  return { deducciones, avisos }
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
  status: string
}

export async function obtenerReglasIva(client: SupabaseClient, taxYear: number): Promise<ReglaIva[]> {
  const { data, error } = await client
    .from('vat_rules')
    .select('tipo, ratePct, productCategory, ejemplos, status')
    .eq('taxYear', taxYear)
    .order('ratePct', { ascending: false })

  if (error) throw error
  return (data ?? []).map(f => ({
    tipo: String(f.tipo),
    ratePct: decimalANumero(f.ratePct) ?? 0,
    productCategory: f.productCategory ? String(f.productCategory) : null,
    ejemplos: f.ejemplos ? String(f.ejemplos) : null,
    status: String(f.status),
  }))
}

export interface TipoIs {
  tipoEntidad: string
  requisitoFacturacion: string | null
  tipoPct: number
  taxYear: number
  previsto: boolean
  notas: string | null
  status: string
}

export async function obtenerTiposIs(client: SupabaseClient): Promise<TipoIs[]> {
  const { data, error } = await client
    .from('is_tipos')
    .select('tipoEntidad, requisitoFacturacion, tipoPct, taxYear, previsto, notas, status')
    .order('taxYear')

  if (error) throw error
  return (data ?? []).map(f => ({
    tipoEntidad: String(f.tipoEntidad),
    requisitoFacturacion: f.requisitoFacturacion ? String(f.requisitoFacturacion) : null,
    tipoPct: decimalANumero(f.tipoPct) ?? 0,
    taxYear: Number(f.taxYear),
    previsto: Boolean(f.previsto),
    notas: f.notas ? String(f.notas) : null,
    status: String(f.status),
  }))
}

export interface BonificacionPatrimonio {
  id: string
  comunidad: string
  descripcion: string
  porcentajeCents: number
  importeMaxCents: number | null
  condiciones: string | null
  notas: string | null
  status: string
}

export async function obtenerEscalaPatrimonio(
  client: SupabaseClient,
  taxYear: number,
  comunidad?: string,
): Promise<{ estatal: TramoIrpf[]; autonomico: TramoIrpf[] | null; comunidad: string | null; avisos: string[] }> {
  // Escala estatal siempre
  const { data: estatalData, error: estatalErr } = await client
    .from('patrimonio_escala_estatal')
    .select('tramo, desdeEur, hastaEur, tipoPct, taxYear, status')
    .eq('taxYear', taxYear)
    .eq('territorio', 'Estatal')
    .order('desdeEur')

  if (estatalErr) throw estatalErr
  const estatalFilas = (estatalData ?? []) as Array<Record<string, unknown>>
  const estatal = aTramosIrpf(estatalFilas, 'tipoPct')

  // Escala autonómica si la comunidad tiene una
  let autonomico: TramoIrpf[] | null = null
  let comunidadSeleccionada: string | null = null
  if (comunidad) {
    const { data: autoData } = await client
      .from('patrimonio_escala_estatal')
      .select('tramo, desdeEur, hastaEur, tipoPct, taxYear, status')
      .eq('taxYear', taxYear)
      .eq('territorio', comunidad)
      .order('desdeEur')
    if (autoData && autoData.length > 0) {
      autonomico = aTramosIrpf(autoData as Array<Record<string, unknown>>, 'tipoPct')
      comunidadSeleccionada = comunidad
    }
  }

  const todasFilas = [...estatalFilas, ...((autonomico ?? []).length > 0 ? [] : [])]
  const avisos = todasFilas.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []

  return { estatal, autonomico, comunidad: comunidadSeleccionada, avisos }
}

export async function obtenerBonificacionesPatrimonio(
  client: SupabaseClient,
  comunidad: string,
  taxYear: number,
): Promise<{ bonificaciones: BonificacionPatrimonio[]; avisos: string[] }> {
  const { data, error } = await client
    .from('patrimonio_bonificaciones')
    .select('id, comunidad, descripcion, porcentajeCents, importeMaxCents, condiciones, notas, status')
    .eq('taxYear', taxYear)
    .eq('comunidad', comunidad)

  if (error) throw error
  if (!data?.length) return { bonificaciones: [], avisos: [] }

  const avisos = data.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []
  const bonificaciones: BonificacionPatrimonio[] = data.map(f => ({
    id: String(f.id),
    comunidad: String(f.comunidad),
    descripcion: String(f.descripcion),
    porcentajeCents: Number(f.porcentajeCents),
    importeMaxCents: f.importeMaxCents != null ? Number(f.importeMaxCents) : null,
    condiciones: f.condiciones != null ? String(f.condiciones) : null,
    notas: f.notas != null ? String(f.notas) : null,
    status: String(f.status),
  }))

  return { bonificaciones, avisos }
}

export interface MinimoFamiliar {
  territorio: string
  concepto: string
  importeEur: number
  notas: string | null
  status: string
}

export async function obtenerMinimos(
  client: SupabaseClient,
  taxYear: number,
  comunidad?: string,
): Promise<MinimoFamiliar[]> {
  const { data, error } = await client
    .from('minimo_personal_familiar')
    .select('territorio, concepto, importeEur, notas, status')
    .eq('taxYear', taxYear)
    .order('territorio')

  if (error) throw error
  const filas = (data ?? []).map(f => ({
    territorio: String(f.territorio),
    concepto: String(f.concepto),
    importeEur: decimalANumero(f.importeEur) ?? 0,
    notas: f.notas ? String(f.notas) : null,
    status: String(f.status),
  }))

  if (!comunidad) return filas
  const jurisdiccion = resolverJurisdiccion(comunidad)
  return filas.filter(f =>
    f.territorio === 'Estatal (referencia común)' ||
    coincideTerritorio(f.territorio, jurisdiccion.nombreNormalizado)
  )
}

export interface ReduccionIrpf {
  concepto: string
  formulaTexto: string | null
  condiciones: string | null
  notas: string | null
  status: string
}

export async function obtenerReducciones(
  client: SupabaseClient,
  taxYear: number,
): Promise<ReduccionIrpf[]> {
  const { data, error } = await client
    .from('reducciones_generales_irpf')
    .select('concepto, formulaTexto, condiciones, notas, status')
    .eq('taxYear', taxYear)

  if (error) throw error
  return (data ?? []).map(f => ({
    concepto: String(f.concepto),
    formulaTexto: f.formulaTexto ? String(f.formulaTexto) : null,
    condiciones: f.condiciones ? String(f.condiciones) : null,
    notas: f.notas ? String(f.notas) : null,
    status: String(f.status),
  }))
}
