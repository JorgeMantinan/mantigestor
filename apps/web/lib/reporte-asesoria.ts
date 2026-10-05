'use client'

import { generarPDFDeHTML } from './pdf'

const _MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export interface FacturaAsesoria {
  tipo: 'emitida' | 'recibida'
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
  categoriaGasto?: string | null
}

export interface PerfilDatos {
  nombre: string | null
  nif: string | null
  direccion?: string | null
  email?: string | null
}

export interface ModeloPresentado {
  modelo: string
  nombre: string
  plazo: string
  presentado: boolean
}

export interface DatosTrimestre {
  trimestre: number
  ivaRepercutido: number
  ivaSoportado: number
  neto: number
  baseImponibleEmitidas: number
  baseImponibleRecibidas: number
}

export interface PagoFraccionado {
  trimestre: number
  base: number
  cuota: number
  pagado: boolean
}

export interface TopGasto {
  categoria: string
  total: number
  porcentaje: number
  numFacturas: number
}

export interface TopCliente {
  cliente: string
  nif: string | null
  total: number
  numFacturas: number
}

export interface ReporteAsesoria {
  anyo: number
  fechaGeneracion: string
  cliente: PerfilDatos
  resumenFiscal: {
    totalIngresos: number
    totalGastos: number
    beneficioNeto: number
    ivaRepercutidoTotal: number
    ivaSoportadoTotal: number
    ivaNetoAnual: number
    retencionesSoportadas: number
    irpfRetenciones: number
    totalFacturasEmitidas: number
    totalFacturasRecibidas: number
  }
  ivaPorTrimestre: DatosTrimestre[]
  retencionesSoportadas: {
    totalRetenciones: number
    numFacturasConRetencion: number
    detallePorTrimestre: { trimestre: number; importe: number }[]
  }
  modelosPresentados: ModeloPresentado[]
  pagosFraccionadosIRPF: PagoFraccionado[]
  anexos: {
    topGastos: TopGasto[]
    topClientes: TopCliente[]
  }
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

function calcularRetenciones(iva: number): number {
  if (iva === 21 || iva === 15 || iva === 10 || iva === 4) return 0
  if (iva === 0) return 0
  return iva
}

export function generarReporteAsesoria(
  facturas: FacturaAsesoria[],
  anyo: number,
  perfil: PerfilDatos
): ReporteAsesoria {
  const emitidas = facturas.filter(f => f.tipo === 'emitida')
  const recibidas = facturas.filter(f => f.tipo === 'recibida')

  const totalIngresos = emitidas.reduce((s, f) => s + f.total, 0)
  const totalGastos = recibidas.reduce((s, f) => s + f.total, 0)
  const ivaRepercutido = emitidas.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
  const ivaSoportado = recibidas.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
  const retencionesSoportadas = recibidas.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
  const irpfRetenciones = emitidas.reduce((s, f) => s + calcularRetenciones(f.iva), 0)

  const ivaPorTrimestre: DatosTrimestre[] = [1, 2, 3, 4].map(t => {
    const trimestreFacturas = facturas.filter(f => {
      const fecha = new Date(f.fechaEmision)
      return fecha.getFullYear() === anyo && getTrimestre(fecha) === t
    })
    const tEmitidas = trimestreFacturas.filter(f => f.tipo === 'emitida')
    const tRecibidas = trimestreFacturas.filter(f => f.tipo === 'recibida')
    const ivaR = tEmitidas.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
    const ivaS = tRecibidas.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
    const baseEmitidas = tEmitidas.reduce((s, f) => s + f.baseImponible, 0)
    const baseRecibidas = tRecibidas.reduce((s, f) => s + f.baseImponible, 0)
    return {
      trimestre: t,
      ivaRepercutido: ivaR,
      ivaSoportado: ivaS,
      neto: ivaR - ivaS,
      baseImponibleEmitidas: baseEmitidas,
      baseImponibleRecibidas: baseRecibidas,
    }
  })

  const retenciones = {
    totalRetenciones: retencionesSoportadas,
    numFacturasConRetencion: recibidas.filter(f => f.iva !== 21 && f.iva !== 15 && f.iva !== 10 && f.iva !== 4 && f.iva !== 0).length,
    detallePorTrimestre: [1, 2, 3, 4].map(t => ({
      trimestre: t,
      importe: recibidas
        .filter(f => {
          const fecha = new Date(f.fechaEmision)
          return fecha.getFullYear() === anyo && getTrimestre(fecha) === t
        })
        .reduce((s, f) => s + calcularRetenciones(f.iva), 0),
    })),
  }

  const modelosPresentados: ModeloPresentado[] = [
    { modelo: '036/037', nombre: 'Alta/Baja Censal', plazo: 'Todo el año', presentado: true },
    { modelo: '303', nombre: 'IVA trimestral', plazo: '20 del mes siguiente al trimestre', presentado: true },
    { modelo: '390', nombre: 'Resumen anual IVA', plazo: '31 enero', presentado: anyo < new Date().getFullYear() },
    { modelo: '130', nombre: 'IRPF trimestral autónomos', plazo: '20 del mes siguiente al trimestre', presentado: true },
    { modelo: '100', nombre: 'IRPF anual', plazo: '30 junio', presentado: anyo < new Date().getFullYear() },
    { modelo: '111', nombre: 'Retenciones trimestral', plazo: '20 del mes siguiente al trimestre', presentado: true },
    { modelo: '190', nombre: 'Resumen anual retenciones', plazo: '31 enero', presentado: anyo < new Date().getFullYear() },
    { modelo: '180', nombre: 'Retenciones arrendamiento', plazo: '31 enero', presentado: false },
    { modelo: '347', nombre: 'Operaciones con terceros', plazo: '28 febrero', presentado: anyo < new Date().getFullYear() },
    { modelo: '720', nombre: 'Bienes en el extranjero', plazo: '31 marzo', presentado: false },
  ]

  const pagosFraccionadosIRPF: PagoFraccionado[] = [1, 2, 3, 4].map(t => {
    const base = ivaPorTrimestre.find(tr => tr.trimestre === t)?.baseImponibleEmitidas ?? 0
    const cuota = Math.round(base * 0.2)
    return { trimestre: t, base, cuota, pagado: true }
  })

  const catMap = new Map<string, { total: number; count: number }>()
  for (const f of recibidas) {
    const cat = f.categoriaGasto ?? 'otros'
    const existing = catMap.get(cat) ?? { total: 0, count: 0 }
    catMap.set(cat, { total: existing.total + f.total, count: existing.count + 1 })
  }
  const topGastos: TopGasto[] = [...catMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([cat, data]) => ({
      categoria: cat,
      total: data.total,
      porcentaje: totalGastos > 0 ? Math.round(data.total / totalGastos * 10000) : 0,
      numFacturas: data.count,
    }))

  const clienteMap = new Map<string, { nif: string | null; total: number; count: number }>()
  for (const f of emitidas) {
    const existing = clienteMap.get(f.emisorReceptor) ?? { nif: f.nifContraparte, total: 0, count: 0 }
    clienteMap.set(f.emisorReceptor, {
      nif: existing.nif ?? f.nifContraparte,
      total: existing.total + f.total,
      count: existing.count + 1,
    })
  }
  const topClientes: TopCliente[] = [...clienteMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([cliente, data]) => ({
      cliente,
      nif: data.nif,
      total: data.total,
      numFacturas: data.count,
    }))

  return {
    anyo,
    fechaGeneracion: new Date().toLocaleDateString('es-ES'),
    cliente: {
      nombre: perfil.nombre,
      nif: perfil.nif,
      direccion: perfil.direccion,
      email: perfil.email,
    },
    resumenFiscal: {
      totalIngresos,
      totalGastos,
      beneficioNeto: totalIngresos - totalGastos,
      ivaRepercutidoTotal: ivaRepercutido,
      ivaSoportadoTotal: ivaSoportado,
      ivaNetoAnual: ivaRepercutido - ivaSoportado,
      retencionesSoportadas,
      irpfRetenciones,
      totalFacturasEmitidas: emitidas.length,
      totalFacturasRecibidas: recibidas.length,
    },
    ivaPorTrimestre,
    retencionesSoportadas: retenciones,
    modelosPresentados,
    pagosFraccionadosIRPF,
    anexos: { topGastos, topClientes },
  }
}

export async function exportarReporteAsesoriaPDF(reporte: ReporteAsesoria): Promise<void> {
  const r = reporte
  const html = `
<div style="font-family:'Segoe UI',system-ui,sans-serif;color:#1a1a1a;padding:0">

  <!-- Cabecera -->
  <div style="text-align:center;margin-bottom:24px;border-bottom:3px solid #1e40af;padding-bottom:16px">
    <h1 style="font-size:22px;color:#1e40af;margin:0 0 4px 0">INFORME DE ASESORÍA FISCAL</h1>
    <p style="font-size:13px;color:#555;margin:0">Ejercicio ${r.anyo}</p>
    <p style="font-size:11px;color:#888;margin:4px 0 0 0">Generado el ${r.fechaGeneracion} · MantiGestor</p>
  </div>

  <!-- Datos del cliente -->
  <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px;margin-bottom:20px">
    <h2 style="font-size:14px;color:#1e40af;margin:0 0 8px 0">1. DATOS DEL CLIENTE</h2>
    <table style="width:100%;font-size:12px;border-collapse:collapse">
      <tr><td style="padding:3px 8px;font-weight:bold;width:120px">Nombre:</td><td style="padding:3px 0">${r.cliente.nombre ?? '—'}</td></tr>
      <tr><td style="padding:3px 8px;font-weight:bold">NIF/CIF:</td><td style="padding:3px 0">${r.cliente.nif ?? '—'}</td></tr>
      <tr><td style="padding:3px 8px;font-weight:bold">Dirección:</td><td style="padding:3px 0">${r.cliente.direccion ?? '—'}</td></tr>
      <tr><td style="padding:3px 8px;font-weight:bold">Email:</td><td style="padding:3px 0">${r.cliente.email ?? '—'}</td></tr>
    </table>
  </div>

  <!-- Resumen fiscal -->
  <div style="margin-bottom:20px">
    <h2 style="font-size:14px;color:#1e40af;margin:0 0 10px 0;border-bottom:2px solid #e5e7eb;padding-bottom:4px">2. RESUMEN FISCAL DEL AÑO ${r.anyo}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f0fdf4;font-weight:bold">Total ingresos</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;font-weight:bold;font-size:13px">${formatEUR(r.resumenFiscal.totalIngresos)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#fef2f2;font-weight:bold">Total gastos</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;color:#dc2626;font-weight:bold;font-size:13px">${formatEUR(r.resumenFiscal.totalGastos)}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Beneficio neto</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${r.resumenFiscal.beneficioNeto >= 0 ? '#16a34a' : '#dc2626'};font-size:13px">${formatEUR(r.resumenFiscal.beneficioNeto)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Facturas</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.resumenFiscal.totalFacturasEmitidas} emitidas · ${r.resumenFiscal.totalFacturasRecibidas} recibidas</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#eff6ff;font-weight:bold">IVA repercutido</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumenFiscal.ivaRepercutidoTotal)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#eff6ff;font-weight:bold">IVA soportado</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumenFiscal.ivaSoportadoTotal)}</td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#eff6ff;font-weight:bold">IVA neto anual</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${r.resumenFiscal.ivaNetoAnual >= 0 ? '#dc2626' : '#16a34a'}">${formatEUR(r.resumenFiscal.ivaNetoAnual)} ${r.resumenFiscal.ivaNetoAnual >= 0 ? '(a ingresar)' : '(a compensar)'}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">IRPF retenciones</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.resumenFiscal.irpfRetenciones)}</td>
      </tr>
    </table>
  </div>

  <!-- IVA por trimestre -->
  <div style="margin-bottom:20px">
    <h2 style="font-size:14px;color:#1e40af;margin:0 0 10px 0;border-bottom:2px solid #e5e7eb;padding-bottom:4px">3. IVA REPERCUTIDO VS SOPORTADO POR TRIMESTRE</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#1e40af;color:#fff">
          <th style="padding:6px;text-align:left">Trimestre</th>
          <th style="padding:6px;text-align:right">Base Emitidas</th>
          <th style="padding:6px;text-align:right">Base Recibidas</th>
          <th style="padding:6px;text-align:right">IVA Repercutido</th>
          <th style="padding:6px;text-align:right">IVA Soportado</th>
          <th style="padding:6px;text-align:right">IVA Neto</th>
        </tr>
      </thead>
      <tbody>
        ${r.ivaPorTrimestre.map(t => `
        <tr>
          <td style="padding:6px;border:1px solid #e5e7eb;font-weight:bold">T${t.trimestre}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(t.baseImponibleEmitidas)}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(t.baseImponibleRecibidas)}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;color:#16a34a">${formatEUR(t.ivaRepercutido)}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;color:#dc2626">${formatEUR(t.ivaSoportado)}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${t.neto >= 0 ? '#dc2626' : '#16a34a'}">${formatEUR(t.neto)}</td>
        </tr>`).join('')}
        <tr style="background:#f1f5f9;font-weight:bold">
          <td style="padding:6px;border:1px solid #e5e7eb">TOTAL</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.ivaPorTrimestre.reduce((s, t) => s + t.baseImponibleEmitidas, 0))}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.ivaPorTrimestre.reduce((s, t) => s + t.baseImponibleRecibidas, 0))}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;color:#16a34a">${formatEUR(r.resumenFiscal.ivaRepercutidoTotal)}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;color:#dc2626">${formatEUR(r.resumenFiscal.ivaSoportadoTotal)}</td>
          <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;color:${r.resumenFiscal.ivaNetoAnual >= 0 ? '#dc2626' : '#16a34a'}">${formatEUR(r.resumenFiscal.ivaNetoAnual)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Retenciones soportadas -->
  <div style="margin-bottom:20px">
    <h2 style="font-size:14px;color:#1e40af;margin:0 0 10px 0;border-bottom:2px solid #e5e7eb;padding-bottom:4px">4. RETENCIONES SOPORTADAS</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Total retenciones</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold">${formatEUR(r.retencionesSoportadas.totalRetenciones)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:bold">Facturas con retención</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${r.retencionesSoportadas.numFacturasConRetencion}</td>
      </tr>
      ${r.retencionesSoportadas.detallePorTrimestre.map(d => `
      <tr>
        <td style="padding:6px;border:1px solid #e5e7eb">Trimestre ${d.trimestre}</td>
        <td style="padding:6px;border:1px solid #e5e7eb;text-align:right" colspan="3">${formatEUR(d.importe)}</td>
      </tr>`).join('')}
    </table>
  </div>

  <!-- Modelos presentados -->
  <div style="margin-bottom:20px">
    <h2 style="font-size:14px;color:#1e40af;margin:0 0 10px 0;border-bottom:2px solid #e5e7eb;padding-bottom:4px">5. MODELOS FISCALES PRESENTADOS</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:5px;text-align:left">Modelo</th>
          <th style="padding:5px;text-align:left">Nombre</th>
          <th style="padding:5px;text-align:left">Plazo</th>
          <th style="padding:5px;text-align:center">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${r.modelosPresentados.map(m => `
        <tr>
          <td style="padding:5px;border:1px solid #e5e7eb;font-weight:bold">${m.modelo}</td>
          <td style="padding:5px;border:1px solid #e5e7eb">${m.nombre}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;color:#666">${m.plazo}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:center">
            <span style="color:${m.presentado ? '#16a34a' : '#dc2626'};font-weight:bold">${m.presentado ? '✓ Presentado' : '✗ Pendiente'}</span>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Pagos fraccionados IRPF -->
  <div style="margin-bottom:20px">
    <h2 style="font-size:14px;color:#1e40af;margin:0 0 10px 0;border-bottom:2px solid #e5e7eb;padding-bottom:4px">6. PAGOS FRACCIONADOS IRPF (Modelo 130)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:5px;text-align:left">Trimestre</th>
          <th style="padding:5px;text-align:right">Base imponible</th>
          <th style="padding:5px;text-align:right">Cuota (20%)</th>
          <th style="padding:5px;text-align:center">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${r.pagosFraccionadosIRPF.map(p => `
        <tr>
          <td style="padding:5px;border:1px solid #e5e7eb;font-weight:bold">T${p.trimestre}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(p.base)}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:right;font-weight:bold">${formatEUR(p.cuota)}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:center;color:${p.pagado ? '#16a34a' : '#dc2626'}">${p.pagado ? 'Pagado' : 'Pendiente'}</td>
        </tr>`).join('')}
        <tr style="background:#f1f5f9;font-weight:bold">
          <td style="padding:5px;border:1px solid #e5e7eb">TOTAL</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.pagosFraccionadosIRPF.reduce((s, p) => s + p.base, 0))}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(r.pagosFraccionadosIRPF.reduce((s, p) => s + p.cuota, 0))}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:center"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Anexo: Top gastos -->
  <div style="margin-bottom:20px">
    <h2 style="font-size:14px;color:#1e40af;margin:0 0 10px 0;border-bottom:2px solid #e5e7eb;padding-bottom:4px">ANEXO A: TOP GASTOS POR CATEGORÍA</h2>
    ${r.anexos.topGastos.length === 0 ? '<p style="font-size:12px;color:#888;text-align:center;padding:12px">No hay gastos registrados</p>' : `
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:5px;text-align:left">#</th>
          <th style="padding:5px;text-align:left">Categoría</th>
          <th style="padding:5px;text-align:right">Total</th>
          <th style="padding:5px;text-align:right">% del total</th>
          <th style="padding:5px;text-align:center">Facturas</th>
        </tr>
      </thead>
      <tbody>
        ${r.anexos.topGastos.map((g, i) => `
        <tr>
          <td style="padding:5px;border:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;font-weight:bold">${g.categoria}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(g.total)}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatPct(g.porcentaje)}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:center">${g.numFacturas}</td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  </div>

  <!-- Anexo: Top clientes -->
  <div style="margin-bottom:20px">
    <h2 style="font-size:14px;color:#1e40af;margin:0 0 10px 0;border-bottom:2px solid #e5e7eb;padding-bottom:4px">ANEXO B: TOP CLIENTES POR FACTURACIÓN</h2>
    ${r.anexos.topClientes.length === 0 ? '<p style="font-size:12px;color:#888;text-align:center;padding:12px">No hay ingresos registrados</p>' : `
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:5px;text-align:left">#</th>
          <th style="padding:5px;text-align:left">Cliente</th>
          <th style="padding:5px;text-align:left">NIF</th>
          <th style="padding:5px;text-align:right">Total facturado</th>
          <th style="padding:5px;text-align:center">Facturas</th>
        </tr>
      </thead>
      <tbody>
        ${r.anexos.topClientes.map((c, i) => `
        <tr>
          <td style="padding:5px;border:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;font-weight:bold">${c.cliente}</td>
          <td style="padding:5px;border:1px solid #e5e7eb">${c.nif ?? '—'}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:right">${formatEUR(c.total)}</td>
          <td style="padding:5px;border:1px solid #e5e7eb;text-align:center">${c.numFacturas}</td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  </div>

  <!-- Pie -->
  <div style="text-align:center;color:#999;font-size:9px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:8px">
    <p style="margin:0">MantiGestor · Informe de asesoría fiscal ${r.anyo} · ${r.fechaGeneracion}</p>
    <p style="margin:4px 0 0 0">Documento generado automáticamente — Revisar antes de presentar</p>
  </div>

</div>
  `
  await generarPDFDeHTML(html, `informe-asesoria-${r.anyo}`, { orientacion: 'portrait' })
}
