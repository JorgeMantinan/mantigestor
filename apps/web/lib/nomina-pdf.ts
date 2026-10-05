'use client'
import { escapeHtml } from './escape-html'

import { generarPDFDeHTML } from '@/lib/pdf'

interface NominaPDF {
  empleada: string
  mes: number
  anyo: number
  salarioBruto: number
  irpf: number
  seguridadSocial: number
  neto: number
  rol: string
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export async function generarNominaPDF(nomina: NominaPDF, empresaNombre: string = 'Mi Empresa S.L.'): Promise<void> {
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div>
          <h1 style="font-size:22px;font-weight:bold;margin:0 0 4px 0">Nómina</h1>
          <p style="font-size:13px;color:#6b7280;margin:0">${MESES[nomina.mes - 1]} ${nomina.anyo}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:14px;font-weight:600;margin:0">${escapeHtml(String(empresaNombre))}</p>
          <p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">CIF: B00000000</p>
        </div>
      </div>

      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
          <div><span style="color:#6b7280">Empleado/a:</span> <strong>${escapeHtml(String(nomina.empleada))}</strong></div>
          <div><span style="color:#6b7280">Puesto:</span> <strong>${nomina.rol === 'jefe' ? 'Director/a' : 'Empleado/a'}</strong></div>
          <div><span style="color:#6b7280">Periodo:</span> <strong>${MESES[nomina.mes - 1]} ${nomina.anyo}</strong></div>
          <div><span style="color:#6b7280">Fecha de pago:</span> <strong>Último día del mes</strong></div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <thead>
          <tr style="border-bottom:2px solid #d1d5db">
            <th style="padding:8px 12px;text-align:left;font-weight:600">Concepto</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600">Devengo</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600">Deducción</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:8px 12px">Salario base</td>
            <td style="padding:8px 12px;text-align:right">${formatEuro(nomina.salarioBruto)}</td>
            <td style="padding:8px 12px;text-align:right">—</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;background:#fef2f2">
            <td style="padding:8px 12px">IRPF (${((nomina.irpf / nomina.salarioBruto) * 100).toFixed(1)}%)</td>
            <td style="padding:8px 12px;text-align:right">—</td>
            <td style="padding:8px 12px;text-align:right;color:#dc2626">−${formatEuro(nomina.irpf)}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;background:#fef2f2">
            <td style="padding:8px 12px">Seguridad Social (${((nomina.seguridadSocial / nomina.salarioBruto) * 100).toFixed(1)}%)</td>
            <td style="padding:8px 12px;text-align:right">—</td>
            <td style="padding:8px 12px;text-align:right;color:#dc2626">−${formatEuro(nomina.seguridadSocial)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #d1d5db;font-weight:bold">
            <td style="padding:10px 12px">Total a percibir</td>
            <td style="padding:10px 12px;text-align:right;color:#16a34a;font-size:16px">${formatEuro(nomina.neto)}</td>
            <td style="padding:10px 12px;text-align:right;color:#dc2626;font-size:13px">${formatEuro(nomina.irpf + nomina.seguridadSocial)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:12px;color:#166534">
        <strong>Resumen:</strong> Salario bruto ${formatEuro(nomina.salarioBruto)} − 
        IRPF ${formatEuro(nomina.irpf)} − Seg. Social ${formatEuro(nomina.seguridadSocial)} = 
        <strong>Neto ${formatEuro(nomina.neto)}</strong>
      </div>

      <div style="margin-top:32px;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af">
        <span>Firma del empleador: ___________________</span>
        <span>Firma del empleado: ___________________</span>
      </div>
    </div>
  `
  await generarPDFDeHTML(html, `nomina-${nomina.empleada.replace(/\s+/g, '-')}-${MESES[nomina.mes - 1]}-${nomina.anyo}`, { orientacion: 'portrait' })
}
