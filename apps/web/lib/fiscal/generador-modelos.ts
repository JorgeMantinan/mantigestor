import {
  calcularModelo111,
  pagosFraccionados130,
  resultadosIvaAnuales,
  type FacturaFiscalMinima,
  type RendimientoRetencion,
} from '@mantigestor/utils'

/** Modelos trimestrales que se generan y almacenan automáticamente */
export const MODELOS_TRIMESTRALES = ['303', '111', '130'] as const

export type Trimestre = 1 | 2 | 3 | 4

/** Fila mínima de `facturas` necesaria para generar modelos (compatible con BD) */
export interface FacturaGeneradora {
  id: string
  tipo: string
  emisorReceptor: string
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  deducible?: boolean | null
}

/** Fila mínima de `nominas` necesaria para generar modelos (compatible con BD) */
export interface NominaGeneradora {
  empleada: string
  mes: number
  anyo: number
  salarioBruto: number
  irpf: number
  rol: string
}

export interface ModeloGenerado {
  modelo: string
  titulo: string
  periodicidad: 'trimestral'
  trimestre: Trimestre
  anyo: number
  /** Huella estable del cálculo: cambia solo si cambian los datos de entrada */
  fingerprint: string
  /** Importe principal del modelo en céntimos (a ingresar / a devolver / a compensar) */
  totalCents: number
  /** Resumen numérico del cálculo en céntimos */
  datos: Record<string, number>
}

export function trimestreDeMes(mes: number): Trimestre {
  return (Math.min(4, Math.max(1, Math.ceil(mes / 3))) as Trimestre)
}

/** Devuelve el trimestre de una fecha ISO, o null si cae fuera del año consultado */
export function trimestreDeFecha(iso: string, anyo: number): Trimestre | null {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime()) || fecha.getFullYear() !== anyo) return null
  return trimestreDeMes(fecha.getMonth() + 1)
}

function serializarEstable(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor)
  if (Array.isArray(valor)) return `[${valor.map(serializarEstable).join(',')}]`
  const entradas = Object.entries(valor as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${serializarEstable(v)}`).join(',')}}`
}

/** FNV-1a de 32 bits — solo para detectar cambios, no para seguridad */
function fnv1a(texto: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function fingerprintModelo(
  modelo: string,
  anyo: number,
  trimestre: Trimestre,
  datos: Record<string, number>
): string {
  const base = `${modelo}|${anyo}|${trimestre}|${serializarEstable(datos)}`
  return `${fnv1a(base)}${fnv1a(`${base}#salto`)}`.slice(0, 16)
}

function aFacturaFiscalMinima(f: FacturaGeneradora): FacturaFiscalMinima {
  return {
    tipo: f.tipo === 'ingreso' ? 'ingreso' : 'gasto',
    importe: f.baseImponible,
    iva: f.iva,
    importeIva: f.total - f.baseImponible,
    deducible: f.deducible !== false,
  }
}

/**
 * Genera los modelos trimestrales (303, 111, 130) de un periodo a partir de
 * los datos de `facturas` y `nominas` tal y como están en la BD (céntimos).
 * Solo produce los modelos que tienen datos relevantes.
 */
export function generarModelosTrimestrales(params: {
  anyo: number
  trimestre: Trimestre
  facturas: FacturaGeneradora[]
  nominas: NominaGeneradora[]
}): ModeloGenerado[] {
  const { anyo, trimestre, facturas, nominas } = params

  const facturasAnyo = facturas.filter(f => f.tipo !== 'proforma' && trimestreDeFecha(f.fechaEmision, anyo) !== null)
  const delTrimestre = facturasAnyo.filter(f => trimestreDeFecha(f.fechaEmision, anyo) === trimestre)

  const modelos: ModeloGenerado[] = []

  // ---------- Modelo 303 — IVA (con compensación arrastrada entre trimestres) ----------
  if (facturasAnyo.length > 0) {
    const porTrimestre: FacturaFiscalMinima[][] = ([1, 2, 3, 4] as Trimestre[]).map(t =>
      facturasAnyo.filter(f => trimestreDeFecha(f.fechaEmision, anyo) === t).map(aFacturaFiscalMinima)
    )
    const r303 = resultadosIvaAnuales(porTrimestre)[trimestre - 1]
    if (r303) {
      const datos303: Record<string, number> = {
        baseImponibleRepercutida: r303.baseImponibleRepercutida,
        cuotaRepercutida: r303.cuotaRepercutida,
        totalCuotaRepercutida: r303.totalCuotaRepercutida,
        baseImponibleSoportada: r303.baseImponibleSoportada,
        totalCuotaSoportada: r303.totalCuotaSoportada,
        resultadoLiquidacion: r303.resultadoLiquidacion,
        compensacionAplicada: r303.compensacionAplicada,
        aIngresar: r303.aIngresar,
        aDevolver: r303.aDevolver,
        aCompensar: r303.aCompensar,
        numFacturas: delTrimestre.length,
      }
      modelos.push({
        modelo: '303',
        titulo: 'IVA trimestral',
        periodicidad: 'trimestral',
        trimestre,
        anyo,
        fingerprint: fingerprintModelo('303', anyo, trimestre, datos303),
        totalCents: r303.aIngresar > 0 ? r303.aIngresar : r303.aDevolver > 0 ? r303.aDevolver : r303.aCompensar,
        datos: datos303,
      })
    }
  }

  // ---------- Modelo 130 — pago fraccionado IRPF ----------
  const beneficiosPorTrimestre = ([1, 2, 3, 4] as Trimestre[]).map(t => {
    const fs = facturasAnyo.filter(f => trimestreDeFecha(f.fechaEmision, anyo) === t)
    const ingresos = fs.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.baseImponible, 0)
    const gastos = fs.filter(f => f.tipo === 'gasto' && f.deducible !== false).reduce((s, f) => s + f.baseImponible, 0)
    return ingresos - gastos
  })
  const hayActividad = facturasAnyo.some(f => f.tipo === 'ingreso' || f.tipo === 'gasto')
  if (hayActividad) {
    const fila = pagosFraccionados130(beneficiosPorTrimestre)[trimestre - 1]
    if (fila) {
      const retencionesSoportadas = nominas
        .filter(n => n.rol === 'empleado' && n.anyo === anyo && trimestreDeMes(n.mes) === trimestre)
        .reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0)
      const aIngresar = Math.max(0, fila.aIngresar - retencionesSoportadas)
      const datos130: Record<string, number> = {
        beneficioAcumulado: fila.beneficioAcumulado,
        cuotaAcumulada: fila.cuotaAcumulada,
        pagosAnteriores: fila.pagosAnteriores,
        retencionesSoportadas,
        aIngresar: fila.aIngresar,
      }
      modelos.push({
        modelo: '130',
        titulo: 'Pago fraccionado IRPF',
        periodicidad: 'trimestral',
        trimestre,
        anyo,
        fingerprint: fingerprintModelo('130', anyo, trimestre, datos130),
        totalCents: aIngresar,
        datos: datos130,
      })
    }
  }

  // ---------- Modelo 111 — retenciones practicadas ----------
  const rendimientos: RendimientoRetencion[] = []
  const porEmpleado = new Map<string, { bruto: number; retencion: number }>()
  for (const n of nominas) {
    if (n.rol !== 'jefe' || n.anyo !== anyo || trimestreDeMes(n.mes) !== trimestre) continue
    const previo = porEmpleado.get(n.empleada) ?? { bruto: 0, retencion: 0 }
    previo.bruto += n.salarioBruto
    previo.retencion += Math.round(n.salarioBruto * (n.irpf / 100))
    porEmpleado.set(n.empleada, previo)
  }
  for (const [nombre, d] of porEmpleado) {
    rendimientos.push({
      tipo: 'trabajo',
      descripcion: nombre,
      brutoCents: d.bruto,
      tipoRetencionPct: d.bruto > 0 ? Math.round((d.retencion / d.bruto) * 10000) / 100 : 0,
      retencionCents: d.retencion,
    })
  }

  const RETENCION_PROFESIONAL = 15
  const porProfesional = new Map<string, number>()
  for (const f of delTrimestre) {
    if (f.tipo !== 'gasto') continue
    porProfesional.set(f.emisorReceptor, (porProfesional.get(f.emisorReceptor) ?? 0) + f.baseImponible)
  }
  for (const [nombre, bruto] of porProfesional) {
    rendimientos.push({
      tipo: 'profesional',
      descripcion: nombre,
      brutoCents: bruto,
      tipoRetencionPct: RETENCION_PROFESIONAL,
      retencionCents: Math.round(bruto * (RETENCION_PROFESIONAL / 100)),
    })
  }

  if (rendimientos.length > 0) {
    const r111 = calcularModelo111(rendimientos, 0)
    const datos111: Record<string, number> = {
      trabajoBruto: r111.trabajoBruto,
      trabajoRetenciones: r111.trabajoRetenciones,
      profesionalBruto: r111.profesionalBruto,
      profesionalRetenciones: r111.profesionalRetenciones,
      totalBruto: r111.totalBruto,
      totalRetenciones: r111.totalRetenciones,
      numPerceptores: porEmpleado.size + porProfesional.size,
    }
    modelos.push({
      modelo: '111',
      titulo: 'Retenciones',
      periodicidad: 'trimestral',
      trimestre,
      anyo,
      fingerprint: fingerprintModelo('111', anyo, trimestre, datos111),
      totalCents: r111.totalRetenciones,
      datos: datos111,
    })
  }

  return modelos
}
