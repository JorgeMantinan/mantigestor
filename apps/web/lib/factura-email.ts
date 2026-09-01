'use client'

import { type PlantillaFactura } from '@/lib/factura-cliente-pdf'

interface FacturaEmailPayload {
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
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function htmlEmailBody(f: FacturaEmailPayload): string {
  const esGasto = f.tipo === 'gasto'
  const titulo = esGasto ? 'Factura Recibida' : 'Factura Emitida'
  const empresa = f.empresaNombre || 'Mi Empresa'
  const direccion = f.empresaDireccion || ''
  const nifEmpresa = f.empresaNif || ''

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#eab308 0%,#f59e0b 100%);border-radius:12px;padding:24px;margin-bottom:24px">
        <h1 style="font-size:22px;font-weight:800;margin:0;color:#000">${titulo}</h1>
        <p style="font-size:13px;color:#1a1a1a;margin:4px 0 0 0">Nº ${f.numero}</p>
      </div>
      <div style="margin-bottom:20px">
        <p style="font-size:14px;color:#555;margin:0 0 4px 0"><strong>Contraparte:</strong> ${f.emisorReceptor}${f.nifContraparte ? ` (${f.nifContraparte})` : ''}</p>
        <p style="font-size:14px;color:#555;margin:0 0 4px 0"><strong>Fecha:</strong> ${new Date(f.fechaEmision).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#1a1a1a;color:white">
            <th style="padding:10px 14px;text-align:left;font-size:12px">Concepto</th>
            <th style="padding:10px 14px;text-align:right;font-size:12px">Base</th>
            <th style="padding:10px 14px;text-align:right;font-size:12px">IVA</th>
            <th style="padding:10px 14px;text-align:right;font-size:12px">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #eee">${esGasto ? 'Gasto' : 'Servicio'}</td>
            <td style="padding:10px 14px;text-align:right;font-size:13px;border-bottom:1px solid #eee">${formatEuro(f.baseImponible)}</td>
            <td style="padding:10px 14px;text-align:right;font-size:13px;border-bottom:1px solid #eee">${f.iva}%</td>
            <td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:700;border-bottom:1px solid #eee">${formatEuro(f.total)}</td>
          </tr>
        </tbody>
      </table>
      <div style="background:#eab308;border-radius:8px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <span style="font-size:14px;font-weight:600;color:#000">TOTAL</span>
        <span style="font-size:22px;font-weight:800;color:#000">${formatEuro(f.total)}</span>
      </div>
      ${f.notas ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:20px"><p style="font-size:12px;margin:0;color:#92400e"><strong>Notas:</strong> ${f.notas}</p></div>` : ''}
      <p style="font-size:12px;color:#999;text-align:center;margin-top:24px">
        Adjunto encontrarás el PDF de esta factura.<br/>
        ${empresa} · ${direccion}${nifEmpresa ? ` · NIF ${nifEmpresa}` : ''}
      </p>
    </div>
  `
}

function pdfHTML(f: FacturaEmailPayload): string {
  const esGasto = f.tipo === 'gasto'
  const titulo = esGasto ? 'FACTURA RECIBIDA' : 'FACTURA EMITIDA'
  const empresa = f.empresaNombre || 'Mi Empresa S.L.'
  const direccion = f.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = f.empresaNif || 'B00000000'

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
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600">${formatEuro(f.total)}</td>
          </tr>
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

export async function enviarFacturaPorEmail(
  facturaId: string,
  email: string,
  factura: FacturaEmailPayload,
  plantilla: PlantillaFactura = 'clasico'
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const htmlBody = htmlEmailBody(factura)

  let pdfBase64: string | undefined
  try {
    pdfBase64 = await generarPDFBlob(factura)
  } catch {
    // PDF generation failed, send without attachment
  }

  const res = await fetch('/api/facturas/enviar-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facturaId,
      email,
      htmlBody,
      pdfBase64,
      numero: factura.numero,
      empresaNombre: factura.empresaNombre || 'Mi Empresa',
    }),
  })

  return res.json()
}

async function generarPDFBlob(factura: FacturaEmailPayload): Promise<string> {
  const html = pdfHTML(factura)

  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '210mm'
  container.style.padding = '20mm'
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif'
  container.style.fontSize = '12px'
  container.style.lineHeight = '1.5'
  container.style.color = '#1a1a1a'
  container.style.background = '#ffffff'
  document.body.appendChild(container)

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const cw = canvas.width ?? 0
    const ch = canvas.height ?? 0
    const ratio = Math.min(pdfWidth / cw, pdfHeight / ch)
    const imgX = (pdfWidth - cw * ratio) / 2
    pdf.addImage(imgData, 'PNG', imgX, 0, cw * ratio, ch * ratio)

    const pdfArrayBuffer = pdf.output('arraybuffer')
    const bytes = new Uint8Array(pdfArrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      const byte = bytes[i]
      if (byte !== undefined) binary += String.fromCharCode(byte)
    }
    return btoa(binary)
  } finally {
    document.body.removeChild(container)
  }
}
