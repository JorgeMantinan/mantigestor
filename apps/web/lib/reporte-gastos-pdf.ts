'use client'
import { escapeHtml } from './escape-html'

import { generarPDFDeHTML } from '@/lib/pdf'

interface LineaReporte {
  fecha: string
  numero: string
  contraparte: string
  baseImponible: number
  iva: number
  total: number
  categoria: string
}

interface ReporteGastos {
  titulo: string
  periodo: string
  lineas: LineaReporte[]
  totalBase: number
  totalIva: number
  total: number
  empresaNombre?: string
  empresaNif?: string
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export async function generarReporteGastosPDF(reporte: ReporteGastos): Promise<void> {
  const empresa = reporte.empresaNombre || 'Mi Empresa S.L.'
  const nif = reporte.empresaNif || 'B00000000'

  const categorias = new Map<string, number>()
  for (const l of reporte.lineas) {
    categorias.set(l.categoria, (categorias.get(l.categoria) ?? 0) + l.total)
  }
  const catsOrdenadas = [...categorias.entries()].sort((a, b) => b[1] - a[1])

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
        <div>
          <h1 style="font-size:24px;font-weight:800;margin:0">${escapeHtml(String(reporte.titulo))}</h1>
          <p style="font-size:13px;color:#6b7280;margin:4px 0 0 0">${reporte.periodo}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:16px;font-weight:700;margin:0">${escapeHtml(String(empresa))}</p>
          <p style="font-size:11px;color:#6b7280;margin:2px 0 0 0">NIF: ${escapeHtml(String(nif))}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
        <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:10px;color:#6b7280;margin:0;text-transform:uppercase">Base imponible</p>
          <p style="font-size:20px;font-weight:800;margin:4px 0 0 0;color:#059669">${formatEuro(reporte.totalBase)}</p>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:10px;color:#6b7280;margin:0;text-transform:uppercase">IVA soportado</p>
          <p style="font-size:20px;font-weight:800;margin:4px 0 0 0;color:#2563eb">${formatEuro(reporte.totalIva)}</p>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:10px;color:#6b7280;margin:0;text-transform:uppercase">Total gastos</p>
          <p style="font-size:20px;font-weight:800;margin:4px 0 0 0">${formatEuro(reporte.total)}</p>
        </div>
      </div>

      ${catsOrdenadas.length > 0 ? `
      <div style="margin-bottom:24px">
        <h2 style="font-size:14px;font-weight:700;margin:0 0 12px 0">Desglose por categoría</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${catsOrdenadas.map(([cat, importe]) => `
            <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f9fafb;border-radius:6px">
              <span style="font-size:12px;text-transform:capitalize">${escapeHtml(cat.replace(/-/g, ' '))}</span>
              <span style="font-size:12px;font-weight:600">${formatEuro(importe)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#1a1a1a;color:white">
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:600">Fecha</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:600">Nº Factura</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:600">Contraparte</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:600">Categoría</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:600">Base</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:600">IVA</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:600">Total</th>
          </tr>
        </thead>
        <tbody>
          ${reporte.lineas.map((l, i) => `
            <tr style="border-bottom:1px solid #e5e7eb;${i % 2 === 0 ? '' : 'background:#f9fafb'}">
              <td style="padding:8px 12px;font-size:11px">${formatFecha(l.fecha)}</td>
              <td style="padding:8px 12px;font-size:11px">${escapeHtml(String(l.numero))}</td>
              <td style="padding:8px 12px;font-size:11px">${escapeHtml(String(l.contraparte))}</td>
              <td style="padding:8px 12px;font-size:11px;text-transform:capitalize">${escapeHtml(l.categoria.replace(/-/g, ' '))}</td>
              <td style="padding:8px 12px;font-size:11px;text-align:right">${formatEuro(l.baseImponible)}</td>
              <td style="padding:8px 12px;font-size:11px;text-align:right">${formatEuro(l.iva)}</td>
              <td style="padding:8px 12px;font-size:11px;text-align:right;font-weight:600">${formatEuro(l.total)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f3f4f6;font-weight:700">
            <td style="padding:10px 12px;font-size:12px" colspan="4">Total (${reporte.lineas.length} facturas)</td>
            <td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(reporte.totalBase)}</td>
            <td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(reporte.totalIva)}</td>
            <td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(reporte.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="font-size:9px;color:#9ca3af;text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">
        <p style="margin:0">${escapeHtml(String(empresa))} · NIF ${escapeHtml(String(nif))} · Generado por MantiGestor</p>
      </div>
    </div>
  `

  const nombre = `reporte-gastos-${reporte.periodo.replace(/\s+/g, '-').toLowerCase()}.pdf`
  await generarPDFDeHTML(html, nombre, { orientacion: 'landscape' })
}
