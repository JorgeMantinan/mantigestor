import { createClient } from '@/lib/supabase/client'

const EU_PREFIXES = ['DE','FR','IT','NL','BE','AT','PT','IE','FI','SE','DK','PL','CZ','RO','BG','HR','HU','SK','SI','LT','LV','EE','CY','MT','LU']

const PAIS_MAP: Record<string, string> = {
  DE: 'Alemania', FR: 'Francia', IT: 'Italia', NL: 'Países Bajos', BE: 'Bélgica',
  AT: 'Austria', PT: 'Portugal', IE: 'Irlanda', FI: 'Finlandia', SE: 'Suecia',
  DK: 'Dinamarca', PL: 'Polonia', CZ: 'Chequia', RO: 'Rumanía', BG: 'Bulgaria',
  HR: 'Croacia', HU: 'Hungría', SK: 'Eslovaquia', SI: 'Eslovenia', LT: 'Lituania',
  LV: 'Letonia', EE: 'Estonia', CY: 'Chipre', MT: 'Malta', LU: 'Luxemburgo',
}

interface FacturaInput {
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  tipo: string
  deducible?: boolean | null
}

export function computeIntracomunitarias(ingresos: FacturaInput[], gastos: FacturaInput[]) {
  const map = new Map<string, { tercero: string; nif: string; pais: string; tipo: string; baseImponible: number }>()

  for (const f of [...ingresos, ...gastos]) {
    if (!f.nifContraparte) continue
    const prefix = f.nifContraparte.substring(0, 2).toUpperCase()
    if (!EU_PREFIXES.includes(prefix)) continue
    if (prefix === 'ES') continue

    const key = f.nifContraparte
    const existing = map.get(key)
    if (existing) {
      existing.baseImponible += f.baseImponible / 100
    } else {
      map.set(key, {
        tercero: f.emisorReceptor,
        nif: f.nifContraparte,
        pais: PAIS_MAP[prefix] ?? prefix,
        tipo: f.tipo === 'ingreso' ? 'entrega' : 'adquisicion',
        baseImponible: f.baseImponible / 100,
      })
    }
  }
  return Array.from(map.values())
}

export interface DatosReales {
  trabajo?: number
  actividades?: number
  pagosACuenta?: number
  deducciones?: number
  baseGeneral?: number
  pagosFraccionados?: number
  base21?: number
  base10?: number
  base4?: number
  deduccionesIva?: number
  baseSop21?: number
  baseSop10?: number
  baseSop4?: number
  base130Ingresos?: number
  base130Gastos?: number
  retencionesNomina?: number
  operacionesIntracomunitarias?: Array<{ tercero: string; nif: string; pais: string; tipo: string; baseImponible: number }>
}

export async function fetchDatosReales(taxYear: number): Promise<DatosReales> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id')
    .eq('userId', user.id)
    .single()
  if (!perfil) return {}

  const perfilId = perfil.id

  const desde = `${taxYear}-01-01`
  const hasta = `${taxYear + 1}-01-01`

  const [facturasRes, nominasEmpRes, _nominasJefeRes, propiedadesRes] = await Promise.all([
    supabase.from('facturas').select('*').eq('perfilId', perfilId)
      .gte('fechaEmision', desde).lt('fechaEmision', hasta),
    supabase.from('nominas').select('salarioBruto, irpf, neto')
      .eq('perfilId', perfilId).eq('rol', 'empleado').eq('anyo', taxYear),
    supabase.from('nominas').select('salarioBruto')
      .eq('perfilId', perfilId).eq('rol', 'jefe').eq('anyo', taxYear),
    supabase.from('propiedades_alquiler').select('id').eq('perfilId', perfilId),
  ])

  let gastosAlquiler = 0
  if (propiedadesRes.data && propiedadesRes.data.length > 0) {
    const ids = propiedadesRes.data.map(p => p.id)
    const { data: gastos } = await supabase
      .from('gastos_alquiler').select('importe').in('propiedadId', ids)
      .gte('fecha', desde).lt('fecha', hasta)
    if (gastos) gastosAlquiler = gastos.reduce((s, g) => s + (g.importe ?? 0), 0) / 100
  }

  const facturasArr = (facturasRes.data ?? []) as unknown as Array<{
    tipo: string;
    baseImponible: number; iva: number; emisorReceptor: string; nifContraparte: string | null; deducible?: boolean | null
  }>

  const facturasIngreso = facturasArr.filter(f => f.tipo === 'ingreso')
  const facturasGasto = facturasArr.filter(f => f.deducible !== false)

  const ingresosFacturas = facturasIngreso.reduce((s, f) => s + f.baseImponible / 100, 0)
  const gastosFacturas = facturasGasto.reduce((s, f) => s + f.baseImponible / 100, 0)
  const actividadesNetas = Math.max(0, ingresosFacturas - gastosFacturas)

  const trabajoNeto = nominasEmpRes.data ? nominasEmpRes.data.reduce((s, n) => s + n.neto, 0) / 100 : 0
  const retencionesNomina = nominasEmpRes.data
    ? nominasEmpRes.data.reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0) / 100 : 0

  const baseGeneral = trabajoNeto + actividadesNetas

  const base21 = facturasIngreso.filter(f => f.iva === 21).reduce((s, f) => s + f.baseImponible, 0) / 100
  const base10 = facturasIngreso.filter(f => f.iva === 10).reduce((s, f) => s + f.baseImponible, 0) / 100
  const base4 = facturasIngreso.filter(f => f.iva === 4).reduce((s, f) => s + f.baseImponible, 0) / 100
  const deduccionesIva = facturasGasto.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0) / 100

  const gastosDeducibles = facturasGasto
  const baseSop21 = gastosDeducibles.filter(f => f.iva === 21).reduce((s, f) => s + f.baseImponible, 0) / 100
  const baseSop10 = gastosDeducibles.filter(f => f.iva === 10).reduce((s, f) => s + f.baseImponible, 0) / 100
  const baseSop4 = gastosDeducibles.filter(f => f.iva === 4).reduce((s, f) => s + f.baseImponible, 0) / 100

  const base130Ingresos = facturasIngreso.reduce((s, f) => s + f.baseImponible, 0) / 100
  const base130Gastos = gastosFacturas

  const operacionesIntracomunitarias = computeIntracomunitarias(facturasIngreso, facturasGasto)

  return {
    trabajo: trabajoNeto,
    actividades: actividadesNetas,
    pagosACuenta: retencionesNomina,
    deducciones: gastosAlquiler,
    baseGeneral,
    pagosFraccionados: retencionesNomina,
    base21, base10, base4, deduccionesIva,
    baseSop21, baseSop10, baseSop4,
    base130Ingresos, base130Gastos,
    retencionesNomina: retencionesNomina,
    operacionesIntracomunitarias,
  }
}
