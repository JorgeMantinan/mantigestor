'use client'

import { generarPDFDeHTML } from '@/lib/pdf'

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
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export async function generarFacturaClientePDF(factura: FacturaPDF): Promise<void> {
  const esGasto = factura.tipo === 'gasto'
  const titulo = esGasto ? 'FACTURA RECIBIDA' : 'FACTURA EMITIDA'
  const empresa = factura.empresaNombre || 'Mi Empresa S.L.'
  const direccion = factura.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = factura.empresaNif || 'B00000000'

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
        <div>
          <h1 style="font-size:28px;font-weight:800;margin:0;color:#1a1a1a;letter-spacing:-0.5px">${titulo}</h1>
          <p style="font-size:14px;color:#6b7280;margin:4px 0 0 0">Nº ${factura.numero}</p>
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
          <p style="font-size:14px;font-weight:600;margin:0">${factura.emisorReceptor}</p>
          ${factura.nifContraparte ? `<p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">NIF: ${factura.nifContraparte}</p>` : ''}
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px">
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0">Fecha</p>
          <p style="font-size:14px;font-weight:600;margin:0">${new Date(factura.fechaEmision).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
            <td style="padding:12px 16px;font-size:13px">${esGasto ? 'Gasto' : 'Servicio'} — ${factura.emisorReceptor}</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px">${formatEuro(factura.baseImponible)}</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px">${factura.iva}%</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600">${formatEuro(factura.total)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#f3f4f6">
            <td style="padding:12px 16px;font-weight:700;font-size:14px" colspan="3">Total</td>
            <td style="padding:12px 16px;text-align:right;font-weight:800;font-size:18px">${formatEuro(factura.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="font-size:12px;margin:0;color:#1e40af">
          <strong>Desglose:</strong> Base imponible ${formatEuro(factura.baseImponible)} + 
          IVA ${factura.iva}% (${formatEuro(factura.total - factura.baseImponible)}) = 
          <strong>Total ${formatEuro(factura.total)}</strong>
        </p>
      </div>

      <div style="margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center">
        <p style="margin:0">${empresa} · ${direccion} · NIF ${nifEmpresa}</p>
        <p style="margin:4px 0 0 0">Documento generado por MantiGestor</p>
      </div>
    </div>
  `
  await generarPDFDeHTML(html, `factura-${factura.numero}`, { orientacion: 'portrait' })
}
