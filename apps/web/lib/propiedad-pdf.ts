'use client'

import { generarPDFDeHTML } from '@/lib/pdf'

interface PropiedadPDF {
  nombre: string
  direccion: string | null
  ingresos: number
  gastos: number
  balance: number
  gastosDetalle?: { concepto: string; importe: number; fecha: string }[]
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export async function generarPropiedadPDF(propiedad: PropiedadPDF, empresaNombre?: string): Promise<void> {
  const empresa = empresaNombre || 'Mi Empresa S.L.'
  const gastosDet = propiedad.gastosDetalle ?? []

  const html = `
    <div style="font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div>
          <h1 style="font-size:22px;font-weight:800;margin:0">${propiedad.nombre}</h1>
          ${propiedad.direccion ? `<p style="font-size:12px;color:#6b7280;margin:4px 0 0 0">${propiedad.direccion}</p>` : ''}
        </div>
        <div style="text-align:right">
          <p style="font-size:14px;font-weight:700;margin:0">${empresa}</p>
          <p style="font-size:11px;color:#6b7280;margin:2px 0 0 0">Informe de propiedad</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:10px;color:#6b7280;margin:0;text-transform:uppercase">Ingresos totales</p>
          <p style="font-size:18px;font-weight:800;margin:4px 0 0 0;color:#16a34a">${formatEuro(propiedad.ingresos)}</p>
        </div>
        <div style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:10px;color:#6b7280;margin:0;text-transform:uppercase">Gastos totales</p>
          <p style="font-size:18px;font-weight:800;margin:4px 0 0 0;color:#ef4444">${formatEuro(propiedad.gastos)}</p>
        </div>
        <div style="background:${propiedad.balance >= 0 ? '#f0fdf4' : '#fef2f2'};border-radius:8px;padding:16px;text-align:center">
          <p style="font-size:10px;color:#6b7280;margin:0;text-transform:uppercase">Balance</p>
          <p style="font-size:18px;font-weight:800;margin:4px 0 0 0;color:${propiedad.balance >= 0 ? '#16a34a' : '#ef4444'}">${formatEuro(propiedad.balance)}</p>
        </div>
      </div>

      ${gastosDet.length > 0 ? `
      <h2 style="font-size:14px;font-weight:700;margin:0 0 12px 0">Desglose de gastos</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#1a1a1a;color:white">
            <th style="padding:10px 12px;text-align:left;font-size:11px">Fecha</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px">Concepto</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${gastosDet.map((g, i) => `
            <tr style="border-bottom:1px solid #e5e7eb;${i % 2 ? 'background:#f9fafb' : ''}">
              <td style="padding:8px 12px;font-size:12px">${new Date(g.fecha).toLocaleDateString('es-ES')}</td>
              <td style="padding:8px 12px;font-size:12px">${g.concepto}</td>
              <td style="padding:8px 12px;font-size:12px;text-align:right;color:#ef4444">${formatEuro(g.importe)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f3f4f6;font-weight:700">
            <td style="padding:10px 12px;font-size:12px" colspan="2">Total gastos</td>
            <td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(propiedad.gastos)}</td>
          </tr>
        </tfoot>
      </table>
      ` : ''}

      <p style="font-size:9px;color:#9ca3af;text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">
        ${empresa} · Generado por MantiGestor
      </p>
    </div>
  `

  await generarPDFDeHTML(html, `propiedad-${propiedad.nombre.replace(/\s+/g, '-').toLowerCase()}`, { orientacion: 'portrait' })
}
