'use client'

import { generarPDFDeHTML } from './pdf'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const CATEGORIAS_LABELS: Record<string, string> = {
  suministros: 'Suministros',
  alquiler: 'Alquiler',
  nomina: 'Nóminas',
  seguridad: 'Seguridad social',
  marketing: 'Marketing',
  otros: 'Otros',
  material_limpieza: 'Material limpieza',
  material_oficina: 'Material oficina',
  transporte: 'Transporte',
  servicios_profesionales: 'Servicios profesionales',
  alquiler_local: 'Alquiler local',
  nomina_empleada: 'Nómina empleada',
  cuota_autonomo: 'Cuota autónomo',
  servicio_limpieza: 'Servicio limpieza',
  alquiler_cobrado: 'Alquiler cobrado',
}

export interface FacturaInput {
  tipo: 'ingreso' | 'gasto'
  emisorReceptor: string
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  categoriaGasto: string | null
}

export interface MesData {
  mes: number
  nombre: string
  ingresos: number
  gastos: number
  beneficio: number
  ivaRepercutido: number
  ivaSoportado: number
  numFacturas: number
}

export interface CategoriaData {
  categoria: string
  label: string
  total: number
  porcentaje: number
}

export interface ClienteData {
  cliente: string
  total: number
  numFacturas: number
}

export interface TrimestreIvaData {
  trimestre: number
  ivaRepercutido: number
  ivaSoportado: number
  neto: number
}

export interface Ratios {
  margenBruto: number
  margenBeneficio: number
  gastosFijos: number
  gastosVariables: number
  gastosFijosPorcentaje: number
}

export interface ReporteAnual {
  anyo: number
  fechaGeneracion: string
  resumen: {
    totalIngresos: number
    totalGastos: number
    beneficio: number
    ivaRepercutido: number
    ivaSoportado: number
    ivaNeto: number
    totalFacturas: number
    facturasIngresos: number
    facturasGastos: number
  }
  meses: MesData[]
  categorias: CategoriaData[]
  clientes: ClienteData[]
  ivaPorTrimestre: TrimestreIvaData[]
  retenciones: number
  ratios: Ratios
}

const formatEUR = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const formatPct = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v / 100)

function getTrimestre(fecha: Date): number {
  const mes = fecha.getMonth()
  if (mes < 3) return 1
  if (mes < 6) return 2
  if (mes < 9) return 3
  return 4
}

function esGastoFijo(categoria: string | null): boolean {
  return ['alquiler', 'alquiler_local', 'suministros', 'seguridad', 'nomina', 'nomina_empleada', 'cuota_autonomo'].includes(categoria ?? '')
}

export function generarReporteAnual(facturas: FacturaInput[], anyo: number): ReporteAnual {
  const ingresos = facturas.filter(f => f.tipo === 'ingreso')
  const gastos = facturas.filter(f => f.tipo === 'gasto')
  const totalIngresos = ingresos.reduce((s, f) => s + f.total, 0)
  const totalGastos = gastos.reduce((s, f) => s + f.total, 0)
  const ivaRepercutido = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
  const ivaSoportado = gastos.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)

  // Meses
  const meses: MesData[] = Array.from({ length: 12 }, (_, i) => {
    const mesFacturas = facturas.filter(f => {
      const fecha = new Date(f.fechaEmision)
      return fecha.getFullYear() === anyo && fecha.getMonth() === i
    })
    const mesIngresos = mesFacturas.filter(f => f.tipo === 'ingreso')
    const mesGastos = mesFacturas.filter(f => f.tipo === 'gasto')
    const totalIng = mesIngresos.reduce((s, f) => s + f.total, 0)
    const totalGas = mesGastos.reduce((s, f) => s + f.total, 0)
    return {
      mes: i + 1,
      nombre: MESES[i]!,
      ingresos: totalIng,
      gastos: totalGas,
      beneficio: totalIng - totalGas,
      ivaRepercutido: mesIngresos.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0),
      ivaSoportado: mesGastos.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0),
      numFacturas: mesFacturas.length,
    }
  })

  // Categorías (solo gastos)
  const catMap = new Map<string, number>()
  for (const f of gastos) {
    const cat = f.categoriaGasto ?? 'otros'
    catMap.set(cat, (catMap.get(cat) ?? 0) + f.total)
  }
  const categorias: CategoriaData[] = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cat, total]) => ({
      categoria: cat,
      label: CATEGORIAS_LABELS[cat] ?? cat,
      total,
      porcentaje: totalGastos > 0 ? Math.round(total / totalGastos * 10000) : 0,
    }))

  // Clientes top (solo ingresos)
  const clienteMap = new Map<string, { total: number; count: number }>()
  for (const f of ingresos) {
    const existing = clienteMap.get(f.emisorReceptor) ?? { total: 0, count: 0 }
    clienteMap.set(f.emisorReceptor, {
      total: existing.total + f.total,
      count: existing.count + 1,
    })
  }
  const clientes: ClienteData[] = [...clienteMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([cliente, data]) => ({
      cliente,
      total: data.total,
      numFacturas: data.count,
    }))

  // IVA por trimestre
  const ivaPorTrimestre: TrimestreIvaData[] = [1, 2, 3, 4].map(t => {
    const trimestre = facturas.filter(f => getTrimestre(new Date(f.fechaEmision)) === t && new Date(f.fechaEmision).getFullYear() === anyo)
    const tIngresos = trimestre.filter(f => f.tipo === 'ingreso')
    const tGastos = trimestre.filter(f => f.tipo === 'gasto')
    const ivaR = tIngresos.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
    const ivaS = tGastos.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
    return { trimestre: t, ivaRepercutido: ivaR, ivaSoportado: ivaS, neto: ivaR - ivaS }
  })

  // Retenciones (IRPF) - estimated at 15% for income
  const retenciones = Math.round(totalIngresos * 0.15)

  // Ratios
  const beneficio = totalIngresos - totalGastos
  const gastosFijos = gastos.filter(f => esGastoFijo(f.categoriaGasto)).reduce((s, f) => s + f.total, 0)
  const gastosVariables = totalGastos - gastosFijos
  const ratios: Ratios = {
    margenBruto: totalIngresos > 0 ? Math.round((beneficio / totalIngresos) * 10000) : 0,
    margenBeneficio: totalIngresos > 0 ? Math.round((beneficio / totalIngresos) * 10000) : 0,
    gastosFijos,
    gastosVariables,
    gastosFijosPorcentaje: totalGastos > 0 ? Math.round((gastosFijos / totalGastos) * 10000) : 0,
  }

  return {
    anyo,
    fechaGeneracion: new Date().toLocaleDateString('es-ES'),
    resumen: {
      totalIngresos,
      totalGastos,
      beneficio,
      ivaRepercutido,
      ivaSoportado,
      ivaNeto: ivaRepercutido - ivaSoportado,
      totalFacturas: facturas.length,
      facturasIngresos: ingresos.length,
      facturasGastos: gastos.length,
    },
    meses,
    categorias,
    clientes,
    ivaPorTrimestre,
    retenciones,
    ratios,
  }
}

export async function exportarReportePDF(reporte: ReporteAnual): Promise<void> {
  const r = reporte
  const html = `
<h1 style="font-size:20px;margin-bottom:4px;text-align:center">Reporte Anual ${r.anyo}</h1>
<p style="text-align:center;color:#666;margin-bottom:20px;font-size:11px">Generado el ${r.fechaGeneracion}</p>

<h2 style="font-size:15px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;margin-top:20px">Resumen General</h2>
<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
  <tr>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f0fdf4;font-weight:bold">Total ingresos</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;font-weight:bold">${formatEUR(r.resumen.totalIngresos)}</td>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#fef2f2;font-weight:bold">Total gastos</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;color:#dc2626;font-weight:bold">${formatEUR(r.resumen.totalGastos)}</td>
  </tr>
  <tr>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Beneficio neto</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${r.resumen.beneficio >= 0 ? '#16a34a' : '#dc2626'}">${formatEUR(r.resumen.beneficio)}</td>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Total facturas</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${r.resumen.totalFacturas} (${r.resumen.facturasIngresos} emitidas, ${r.resumen.facturasGastos} recibidas)</td>
  </tr>
  <tr>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#eff6ff;font-weight:bold">IVA repercutido</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumen.ivaRepercutido)}</td>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#eff6ff;font-weight:bold">IVA soportado</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumen.ivaSoportado)}</td>
  </tr>
  <tr>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#eff6ff;font-weight:bold">IVA neto anual</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${r.resumen.ivaNeto >= 0 ? '#dc2626' : '#16a34a'}">${formatEUR(r.resumen.ivaNeto)} ${r.resumen.ivaNeto >= 0 ? '(a ingresar)' : '(a compensar)'}</td>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Retenciones IRPF</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.retenciones)}</td>
  </tr>
</table>

<h2 style="font-size:15px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;margin-top:20px">Desglose Mensual</h2>
<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px">
  <thead>
    <tr style="background:#f3f4f6">
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:left">Mes</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">Ingresos</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">Gastos</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">Beneficio</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">IVA Repercutido</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">IVA Soportado</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:center">Facturas</th>
    </tr>
  </thead>
  <tbody>
    ${r.meses.filter(m => m.numFacturas > 0).map(m => `
    <tr>
      <td style="padding:5px;border:1px solid #e5e7eb;font-weight:bold">${m.nombre}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;color:#16a34a">${formatEUR(m.ingresos)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;color:#dc2626">${formatEUR(m.gastos)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;color:${m.beneficio >= 0 ? '#16a34a' : '#dc2626'};font-weight:bold">${formatEUR(m.beneficio)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(m.ivaRepercutido)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(m.ivaSoportado)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:center">${m.numFacturas}</td>
    </tr>`).join('')}
    <tr style="background:#f9fafb;font-weight:bold">
      <td style="padding:5px;border:1px solid #e5e7eb">TOTAL</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;color:#16a34a">${formatEUR(r.resumen.totalIngresos)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;color:#dc2626">${formatEUR(r.resumen.totalGastos)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;color:${r.resumen.beneficio >= 0 ? '#16a34a' : '#dc2626'}">${formatEUR(r.resumen.beneficio)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumen.ivaRepercutido)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumen.ivaSoportado)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:center">${r.resumen.totalFacturas}</td>
    </tr>
  </tbody>
</table>

<h2 style="font-size:15px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;margin-top:20px">Top 10 Gastos por Categoría</h2>
<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
  <thead>
    <tr style="background:#f3f4f6">
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:left">#</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:left">Categoría</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">Importe</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">% del total</th>
    </tr>
  </thead>
  <tbody>
    ${r.categorias.map((c, i) => `
    <tr>
      <td style="padding:5px;border:1px solid #e5e7eb">${i + 1}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;font-weight:bold">${c.label}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(c.total)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatPct(c.porcentaje)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<h2 style="font-size:15px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;margin-top:20px">Top 10 Clientes por Facturación</h2>
<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
  <thead>
    <tr style="background:#f3f4f6">
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:left">#</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:left">Cliente</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">Total facturado</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:center">Nº facturas</th>
    </tr>
  </thead>
  <tbody>
    ${r.clientes.map((c, i) => `
    <tr>
      <td style="padding:5px;border:1px solid #e5e7eb">${i + 1}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;font-weight:bold">${c.cliente}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(c.total)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:center">${c.numFacturas}</td>
    </tr>`).join('')}
  </tbody>
</table>

<h2 style="font-size:15px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;margin-top:20px">IVA por Trimestre</h2>
<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
  <thead>
    <tr style="background:#f3f4f6">
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:left">Trimestre</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">IVA Repercutido</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">IVA Soportado</th>
      <th style="padding:5px;border:1px solid #e5e7eb;text-align:right">IVA Neto</th>
    </tr>
  </thead>
  <tbody>
    ${r.ivaPorTrimestre.map(t => `
    <tr>
      <td style="padding:5px;border:1px solid #e5e7eb;font-weight:bold">T${t.trimestre}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(t.ivaRepercutido)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(t.ivaSoportado)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${t.neto >= 0 ? '#dc2626' : '#16a34a'}">${formatEUR(t.neto)}</td>
    </tr>`).join('')}
    <tr style="background:#f9fafb;font-weight:bold">
      <td style="padding:5px;border:1px solid #e5e7eb">TOTAL</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumen.ivaRepercutido)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumen.ivaSoportado)}</td>
      <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;color:${r.resumen.ivaNeto >= 0 ? '#dc2626' : '#16a34a'}">${formatEUR(r.resumen.ivaNeto)}</td>
    </tr>
  </tbody>
</table>

<h2 style="font-size:15px;border-bottom:2px solid #e5e7eb;padding-bottom:4px;margin-top:20px">Ratios Financieros</h2>
<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
  <tr>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Margen bruto</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;font-weight:bold">${formatPct(r.ratios.margenBruto)}</td>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc">Ingresos - Gastos / Ingresos</td>
  </tr>
  <tr>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Beneficio neto</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${r.resumen.beneficio >= 0 ? '#16a34a' : '#dc2626'}">${formatEUR(r.resumen.beneficio)}</td>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc">Ingresos totales - Gastos totales</td>
  </tr>
  <tr>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Gastos fijos</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.ratios.gastosFijos)} (${formatPct(r.ratios.gastosFijosPorcentaje)})</td>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc">Alquiler, suministros, nóminas, cuota autónomo, seguridad</td>
  </tr>
  <tr>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Gastos variables</td>
    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.ratios.gastosVariables)} (${formatPct(10000 - r.ratios.gastosFijosPorcentaje)})</td>
    <td style="padding:6px;border:1px solid #e5e7eb;background:#f8fafc">Marketing, material, transporte, otros</td>
  </tr>
</table>

<p style="text-align:center;color:#999;font-size:9px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:8px">MantiGestor · Reporte anual ${r.anyo} · ${r.fechaGeneracion}</p>
  `
  await generarPDFDeHTML(html, `reporte-anual-${r.anyo}`, { orientacion: 'landscape' })
}
