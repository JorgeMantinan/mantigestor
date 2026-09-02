'use client'

import { generarPDFDeHTML } from '@/lib/pdf'

export type PlantillaFactura = 'clasico' | 'moderno' | 'minimalista'

interface FacturaPDF {
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  tipo: string
  empresaNombre?: string
  empresaDireccion?: string
  empresaNif?: string
  notas?: string | null
  descuentoPorcentaje?: number
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function calcularImporteDescuento(baseImponible: number, descuentoPorcentaje: number): number {
  if (!descuentoPorcentaje || descuentoPorcentaje <= 0) return 0
  return Math.round(baseImponible * (descuentoPorcentaje / 100))
}

function htmlClasico(f: FacturaPDF): string {
  const esGasto = f.tipo === 'gasto'
  const titulo = esGasto ? 'FACTURA RECIBIDA' : 'FACTURA EMITIDA'
  const empresa = f.empresaNombre || 'Mi Empresa S.L.'
  const direccion = f.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = f.empresaNif || 'B00000000'
  const importeDescuento = calcularImporteDescuento(f.baseImponible, f.descuentoPorcentaje ?? 0)

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
        <div>
          <h1 style="font-size:28px;font-weight:800;margin:0;color:#1a1a1a">${titulo}</h1>
          <p style="font-size:14px;color:#6b7280;margin:4px 0 0 0">Nº ${f.numero}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:18px;font-weight:700;margin:0">${empresa}</p>
          <p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">${direccion}</p>
          <p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">NIF: ${nifEmpresa}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
        <div style="background:#f9fafb;border-radius:8px;padding:16px">
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0">${esGasto ? 'Proveedor' : 'Cliente'}</p>
          <p style="font-size:14px;font-weight:600;margin:0">${f.emisorReceptor}</p>
          ${f.nifContraparte ? `<p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">NIF: ${f.nifContraparte}</p>` : ''}
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px">
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0">Fecha</p>
          <p style="font-size:14px;font-weight:600;margin:0">${new Date(f.fechaEmision).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#1a1a1a;color:white">
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600">Concepto</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">Base</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">IVA</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:12px 16px;font-size:13px">${esGasto ? 'Gasto' : 'Servicio'} — ${f.emisorReceptor}</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px">${formatEuro(f.baseImponible)}</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px">${f.iva}%</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600">${formatEuro(f.baseImponible + Math.round(f.baseImponible * (f.iva / 100)))}</td>
          </tr>
          ${importeDescuento > 0 ? `
          <tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:12px 16px;font-size:13px;color:#16a34a">Descuento (${f.descuentoPorcentaje}%)</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;color:#16a34a">-${formatEuro(importeDescuento)}</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px"></td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;color:#16a34a">-${formatEuro(importeDescuento)}</td>
          </tr>
          ` : ''}
        </tbody>
        <tfoot>
          <tr style="background:#f3f4f6">
            <td style="padding:12px 16px;font-weight:700;font-size:14px" colspan="3">Total</td>
            <td style="padding:12px 16px;text-align:right;font-weight:800;font-size:18px">${formatEuro(f.total)}</td>
          </tr>
        </tfoot>
      </table>
      ${f.notas ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px"><p style="font-size:12px;margin:0;color:#1e40af"><strong>Notas:</strong> ${f.notas}</p></div>` : ''}
      <div style="margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center">
        <p style="margin:0">${empresa} · ${direccion} · NIF ${nifEmpresa}</p>
        <p style="margin:4px 0 0 0">Documento generado por MantiGestor</p>
      </div>
    </div>
  `
}

function htmlModerno(f: FacturaPDF): string {
  const esGasto = f.tipo === 'gasto'
  const titulo = esGasto ? 'FACTURA RECIBIDA' : 'FACTURA EMITIDA'
  const empresa = f.empresaNombre || 'Mi Empresa S.L.'
  const direccion = f.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = f.empresaNif || 'B00000000'
  const importeDescuento = calcularImporteDescuento(f.baseImponible, f.descuentoPorcentaje ?? 0)

  return `
    <div style="font-family:'Segoe UI',system-ui,sans-serif;color:#111827;padding:40px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%)">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border-bottom:3px solid #10b981;padding-bottom:24px">
          <div>
            <h1 style="font-size:24px;font-weight:800;margin:0;color:#059669">${titulo}</h1>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0 0">Nº ${f.numero}</p>
          </div>
          <div style="text-align:right">
            <p style="font-size:20px;font-weight:800;margin:0;color:#059669">${empresa}</p>
            <p style="font-size:11px;color:#6b7280;margin:2px 0 0 0">${direccion}</p>
            <p style="font-size:11px;color:#6b7280;margin:2px 0 0 0">NIF: ${nifEmpresa}</p>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0">
            <p style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;margin:0 0 4px 0">${esGasto ? 'Proveedor' : 'Cliente'}</p>
            <p style="font-size:13px;font-weight:600;margin:0">${f.emisorReceptor}</p>
            ${f.nifContraparte ? `<p style="font-size:11px;color:#6b7280;margin:2px 0 0 0">NIF: ${f.nifContraparte}</p>` : ''}
          </div>
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0">
            <p style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;margin:0 0 4px 0">Fecha</p>
            <p style="font-size:13px;font-weight:600;margin:0">${new Date(f.fechaEmision).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#059669;color:white">
              <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase">Concepto</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase">Base</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase">IVA</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb">
              <td style="padding:14px 16px;font-size:13px">${esGasto ? 'Gasto' : 'Servicio'} — ${f.emisorReceptor}</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px">${formatEuro(f.baseImponible)}</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px">${f.iva}%</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px;font-weight:700">${formatEuro(f.baseImponible + Math.round(f.baseImponible * (f.iva / 100)))}</td>
            </tr>
            ${importeDescuento > 0 ? `
            <tr style="border-bottom:1px solid #e5e7eb">
              <td style="padding:14px 16px;font-size:13px;color:#16a34a">Descuento (${f.descuentoPorcentaje}%)</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px;color:#16a34a">-${formatEuro(importeDescuento)}</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px"></td>
              <td style="padding:14px 16px;text-align:right;font-size:13px;font-weight:700;color:#16a34a">-${formatEuro(importeDescuento)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
        <div style="background:#059669;color:white;border-radius:12px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:14px;font-weight:600">TOTAL</span>
          <span style="font-size:24px;font-weight:800">${formatEuro(f.total)}</span>
        </div>
        ${f.notas ? `<div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:12px;margin-top:16px"><p style="font-size:11px;margin:0;color:#065f46"><strong>Notas:</strong> ${f.notas}</p></div>` : ''}
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center">
          <p style="margin:0">${empresa} · ${direccion} · NIF ${nifEmpresa}</p>
          <p style="margin:4px 0 0 0">Generado con MantiGestor</p>
        </div>
      </div>
    </div>
  `
}

function htmlMinimalista(f: FacturaPDF): string {
  const esGasto = f.tipo === 'gasto'
  const titulo = esGasto ? 'FACTURA RECIBIDA' : 'FACTURA EMITIDA'
  const empresa = f.empresaNombre || 'Mi Empresa S.L.'
  const direccion = f.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = f.empresaNif || 'B00000000'
  const importeDescuento = calcularImporteDescuento(f.baseImponible, f.descuentoPorcentaje ?? 0)

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#000;padding:48px">
      <div style="margin-bottom:48px">
        <h1 style="font-size:32px;font-weight:300;margin:0;letter-spacing:4px">${titulo}</h1>
        <div style="display:flex;justify-content:space-between;margin-top:8px">
          <p style="font-size:12px;color:#999;margin:0">Nº ${f.numero}</p>
          <p style="font-size:12px;color:#999;margin:0">${new Date(f.fechaEmision).toLocaleDateString('es-ES')}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:48px">
        <div>
          <p style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">${esGasto ? 'Proveedor' : 'Cliente'}</p>
          <p style="font-size:14px;font-weight:600;margin:0">${f.emisorReceptor}</p>
          ${f.nifContraparte ? `<p style="font-size:12px;color:#666;margin:4px 0 0 0">${f.nifContraparte}</p>` : ''}
        </div>
        <div>
          <p style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">De</p>
          <p style="font-size:14px;font-weight:600;margin:0">${empresa}</p>
          <p style="font-size:12px;color:#666;margin:4px 0 0 0">${nifEmpresa}</p>
          <p style="font-size:12px;color:#666;margin:4px 0 0 0">${direccion}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
        <thead>
          <tr style="border-bottom:2px solid #000">
            <th style="padding:12px 0;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Descripción</th>
            <th style="padding:12px 0;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Base</th>
            <th style="padding:12px 0;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">IVA</th>
            <th style="padding:12px 0;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:16px 0;font-size:13px">${esGasto ? 'Gasto' : 'Servicio'}</td>
            <td style="padding:16px 0;text-align:right;font-size:13px">${formatEuro(f.baseImponible)}</td>
            <td style="padding:16px 0;text-align:right;font-size:13px">${f.iva}%</td>
            <td style="padding:16px 0;text-align:right;font-size:13px;font-weight:600">${formatEuro(f.baseImponible + Math.round(f.baseImponible * (f.iva / 100)))}</td>
          </tr>
          ${importeDescuento > 0 ? `
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:16px 0;font-size:13px;color:#16a34a">Descuento (${f.descuentoPorcentaje}%)</td>
            <td style="padding:16px 0;text-align:right;font-size:13px;color:#16a34a">-${formatEuro(importeDescuento)}</td>
            <td style="padding:16px 0;text-align:right;font-size:13px"></td>
            <td style="padding:16px 0;text-align:right;font-size:13px;font-weight:600;color:#16a34a">-${formatEuro(importeDescuento)}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
      <div style="text-align:right;margin-bottom:48px">
        <p style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px 0">Total a pagar</p>
        <p style="font-size:36px;font-weight:200;margin:0">${formatEuro(f.total)}</p>
      </div>
      ${f.notas ? `<p style="font-size:11px;color:#666;margin:0 0 32px 0;border-top:1px solid #eee;padding-top:16px">${f.notas}</p>` : ''}
      <div style="font-size:9px;color:#ccc;text-align:center;letter-spacing:1px">
        <p style="margin:0">${empresa.toUpperCase()} · ${nifEmpresa}</p>
      </div>
    </div>
  `
}

const plantillas: Record<PlantillaFactura, (f: FacturaPDF) => string> = {
  clasico: htmlClasico,
  moderno: htmlModerno,
  minimalista: htmlMinimalista,
}

export const NOMBRES_PLANTILLAS: Record<PlantillaFactura, string> = {
  clasico: 'Clásico',
  moderno: 'Moderno',
  minimalista: 'Minimalista',
}

export async function generarFacturaClientePDF(
  factura: FacturaPDF,
  plantilla: PlantillaFactura = 'clasico'
): Promise<void> {
  const htmlFn = plantillas[plantilla] ?? htmlClasico
  const html = htmlFn(factura)
  await generarPDFDeHTML(html, `factura-${factura.numero}`, { orientacion: 'portrait' })
}
