'use client'
import { escapeHtml } from './escape-html'
import QRCode from 'qrcode'

import { generarPDFDeHTML } from '@/lib/pdf'
import { type PagoParcial, calcularSaldoPendiente } from '@/lib/pago-parcial'
import { type IdiomaPDF, obtenerTextosPDF } from '@/lib/i18n-pdf'

export type PlantillaFactura = 'clasico' | 'moderno' | 'minimalista'

export interface EmpresaDatos {
  id: string
  nombre: string
  nif: string
  direccion: string
  activa: boolean
  logoBase64?: string
  firmaBase64?: string
}

interface FacturaPDF {
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  tipo: string
  empresaId?: string
  empresaNombre?: string
  empresaDireccion?: string
  empresaNif?: string
  notas?: string | null
  descuentoPorcentaje?: number
  pagosParciales?: PagoParcial[]
  logoBase64?: string
  firmaBase64?: string
  qrUrl?: string
  qrDataUrl?: string | null
  idioma?: IdiomaPDF
}

export function resolverLogoFirmaEmpresa(
  factura: FacturaPDF,
  empresas: EmpresaDatos[]
): { logoBase64?: string; firmaBase64?: string } {
  if (factura.empresaId && empresas.length > 0) {
    const empresa = empresas.find(e => e.id === factura.empresaId)
    if (empresa) {
      return {
        logoBase64: empresa.logoBase64 ?? factura.logoBase64,
        firmaBase64: empresa.firmaBase64 ?? factura.firmaBase64,
      }
    }
  }
  return {
    logoBase64: factura.logoBase64,
    firmaBase64: factura.firmaBase64,
  }
}

function esRectificativa(tipo: string): boolean {
  return tipo === 'rectificativa'
}

function esNotaCredito(tags: string | null | undefined): boolean {
  return tags?.includes('nota-credito') ?? false
}

function obtenerTituloRectificativa(f: FacturaPDF): string | null {
  if (!esRectificativa(f.tipo)) return null
  const t = obtenerTextosPDF(f.idioma)
  return esNotaCredito(f.notas) ? t.nota_credito : t.nota_debito
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function calcularImporteDescuento(baseImponible: number, descuentoPorcentaje: number): number {
  if (!descuentoPorcentaje || descuentoPorcentaje <= 0) return 0
  return Math.round(baseImponible * (descuentoPorcentaje / 100))
}

function htmlPagosParciales(pagos: PagoParcial[], total: number, idioma?: IdiomaPDF): string {
  if (!pagos || pagos.length === 0) return ''
  const t = obtenerTextosPDF(idioma)
  const pagado = pagos.reduce((s, p) => s + p.importe, 0)
  const pendiente = calcularSaldoPendiente(total, JSON.stringify(pagos))
  const porcentaje = Math.min(100, (pagado / total) * 100)
  const locale = idioma === 'en' ? 'en-GB' : 'es-ES'

  return `
    <div style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
      <p style="font-size:12px;font-weight:700;color:#374151;margin:0 0 12px 0;text-transform:uppercase">${t.estado_pago}</p>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;color:#6b7280">${t.pagado}: ${formatEuro(pagado)}</span>
        <span style="font-size:11px;color:#6b7280">${t.pendiente}: ${formatEuro(pendiente)}</span>
      </div>
      <div style="background:#e5e7eb;border-radius:999px;height:8px;margin-bottom:12px">
        <div style="background:#16a34a;border-radius:999px;height:8px;width:${porcentaje}%"></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="border-bottom:1px solid #e5e7eb">
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:#6b7280">${t.fecha_pago}</th>
            <th style="padding:6px 8px;text-align:right;font-weight:600;color:#6b7280">${t.importe}</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:#6b7280">${t.metodo}</th>
            <th style="padding:6px 8px;text-align:left;font-weight:600;color:#6b7280">${t.nota}</th>
          </tr>
        </thead>
        <tbody>
          ${pagos.map(p => `
          <tr style="border-bottom:1px solid #f3f4f6">
            <td style="padding:6px 8px;color:#374151">${new Date(p.fecha).toLocaleDateString(locale)}</td>
            <td style="padding:6px 8px;text-align:right;font-weight:600;color:#374151">${formatEuro(p.importe)}</td>
            <td style="padding:6px 8px;color:#6b7280;text-transform:capitalize">${escapeHtml(String(p.metodo))}</td>
            <td style="padding:6px 8px;color:#6b7280">${escapeHtml(p.notas || '—')}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function htmlLogo(logoBase64?: string): string {
  if (!logoBase64) return ''
  return `<img src="${escapeHtml(String(logoBase64))}" style="max-width:80px;max-height:80px;object-fit:contain" alt="Logo empresa" />`
}

function htmlFirma(firmaBase64?: string): string {
  if (!firmaBase64) return ''
  let imagen = ''
  let nombre = ''
  try {
    const parsed = JSON.parse(firmaBase64) as { imagen?: string; nombre?: string }
    imagen = parsed.imagen ?? ''
    nombre = parsed.nombre ?? ''
  } catch {
    imagen = firmaBase64
  }
  if (!imagen) return ''
  return `
    <div style="margin-top:32px;display:flex;justify-content:flex-end">
      <div style="text-align:center;width:240px">
        <img src="${escapeHtml(String(imagen))}" style="max-height:80px;width:auto" alt="Firma digital" />
        <div style="border-top:1px solid #374151;margin-top:4px;padding-top:4px">
          <p style="font-size:11px;font-weight:600;color:#1a1a1a;margin:0">${escapeHtml(String(nombre))}</p>
        </div>
      </div>
    </div>
  `
}

function htmlQR(qrDataUrl: string, idioma?: IdiomaPDF): string {
  const t = obtenerTextosPDF(idioma)
  return `
    <div style="text-align:center;margin-top:16px">
      <img src="${qrDataUrl}" alt="QR factura" style="width:100px;height:100px" />
      <p style="font-size:8px;color:#9ca3af;margin:4px 0 0 0">${t.scan_para_ver}</p>
    </div>
  `
}

function htmlClasico(f: FacturaPDF): string {
  const esGasto = f.tipo === 'gasto'
  const t = obtenerTextosPDF(f.idioma)
  const tituloRectificativa = obtenerTituloRectificativa(f)
  const titulo = tituloRectificativa ?? (esGasto ? t.factura_recibida : t.factura_emitida)
  const empresa = f.empresaNombre || 'Mi Empresa S.L.'
  const direccion = f.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = f.empresaNif || 'B00000000'
  const importeDescuento = calcularImporteDescuento(f.baseImponible, f.descuentoPorcentaje ?? 0)
  const locale = f.idioma === 'en' ? 'en-GB' : 'es-ES'
  const clienteLabel = esGasto ? t.proveedor : t.cliente

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
        <div>
          ${f.logoBase64 ? `<div style="margin-bottom:12px">${htmlLogo(f.logoBase64)}</div>` : ''}
          <h1 style="font-size:28px;font-weight:800;margin:0;color:#1a1a1a">${titulo}</h1>
          <p style="font-size:14px;color:#6b7280;margin:4px 0 0 0">${t.numero} ${escapeHtml(String(f.numero))}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:18px;font-weight:700;margin:0">${escapeHtml(String(empresa))}</p>
          <p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">${escapeHtml(String(direccion))}</p>
          <p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">${t.nif}: ${escapeHtml(String(nifEmpresa))}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
        <div style="background:#f9fafb;border-radius:8px;padding:16px">
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0">${clienteLabel}</p>
          <p style="font-size:14px;font-weight:600;margin:0">${escapeHtml(String(f.emisorReceptor))}</p>
          ${f.nifContraparte ? `<p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">${t.nif}: ${escapeHtml(String(f.nifContraparte))}</p>` : ''}
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px">
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0">${t.fecha}</p>
          <p style="font-size:14px;font-weight:600;margin:0">${new Date(f.fechaEmision).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#1a1a1a;color:white">
            <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600">${t.concepto}</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">${t.base_imponible}</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">${t.iva}</th>
            <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">${t.total}</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:12px 16px;font-size:13px">${esGasto ? t.gasto : t.servicio} — ${escapeHtml(String(f.emisorReceptor))}</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px">${formatEuro(f.baseImponible)}</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px">${f.iva}%</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600">${formatEuro(f.baseImponible + Math.round(f.baseImponible * (f.iva / 100)))}</td>
          </tr>
          ${importeDescuento > 0 ? `
          <tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:12px 16px;font-size:13px;color:#16a34a">${t.descuento} (${f.descuentoPorcentaje}%)</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;color:#16a34a">-${formatEuro(importeDescuento)}</td>
            <td style="padding:12px 16px;text-align:right;font-size:13px"></td>
            <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;color:#16a34a">-${formatEuro(importeDescuento)}</td>
          </tr>
          ` : ''}
        </tbody>
        <tfoot>
          <tr style="background:#f3f4f6">
            <td style="padding:12px 16px;font-weight:700;font-size:14px" colspan="3">${t.total}</td>
            <td style="padding:12px 16px;text-align:right;font-weight:800;font-size:18px">${formatEuro(f.total)}</td>
          </tr>
        </tfoot>
      </table>
      ${f.pagosParciales && f.pagosParciales.length > 0 ? htmlPagosParciales(f.pagosParciales, f.total, f.idioma) : ''}
      ${f.notas ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px"><p style="font-size:12px;margin:0;color:#1e40af"><strong>${t.notas}</strong> ${escapeHtml(String(f.notas))}</p></div>` : ''}
      ${htmlFirma(f.firmaBase64)}
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb">
        <div style="font-size:10px;color:#9ca3af">
          <p style="margin:0">${escapeHtml(String(empresa))} · ${escapeHtml(String(direccion))} · ${t.nif} ${escapeHtml(String(nifEmpresa))}</p>
          <p style="margin:4px 0 0 0">${t.documento_generado_por}</p>
        </div>
        ${f.qrDataUrl ? `<div>${htmlQR(f.qrDataUrl, f.idioma)}</div>` : ''}
      </div>
    </div>
  `
}

function htmlModerno(f: FacturaPDF): string {
  const esGasto = f.tipo === 'gasto'
  const t = obtenerTextosPDF(f.idioma)
  const tituloRectificativa = obtenerTituloRectificativa(f)
  const titulo = tituloRectificativa ?? (esGasto ? t.factura_recibida : t.factura_emitida)
  const empresa = f.empresaNombre || 'Mi Empresa S.L.'
  const direccion = f.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = f.empresaNif || 'B00000000'
  const importeDescuento = calcularImporteDescuento(f.baseImponible, f.descuentoPorcentaje ?? 0)
  const locale = f.idioma === 'en' ? 'en-GB' : 'es-ES'
  const clienteLabel = esGasto ? t.proveedor : t.cliente

  return `
    <div style="font-family:'Segoe UI',system-ui,sans-serif;color:#111827;padding:40px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%)">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border-bottom:3px solid #10b981;padding-bottom:24px">
          <div>
            ${f.logoBase64 ? `<div style="margin-bottom:8px">${htmlLogo(f.logoBase64)}</div>` : ''}
            <h1 style="font-size:24px;font-weight:800;margin:0;color:#059669">${titulo}</h1>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0 0">${t.numero} ${escapeHtml(String(f.numero))}</p>
          </div>
          <div style="text-align:right">
            <p style="font-size:20px;font-weight:800;margin:0;color:#059669">${escapeHtml(String(empresa))}</p>
            <p style="font-size:11px;color:#6b7280;margin:2px 0 0 0">${escapeHtml(String(direccion))}</p>
            <p style="font-size:11px;color:#6b7280;margin:2px 0 0 0">${t.nif}: ${escapeHtml(String(nifEmpresa))}</p>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0">
            <p style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;margin:0 0 4px 0">${clienteLabel}</p>
            <p style="font-size:13px;font-weight:600;margin:0">${escapeHtml(String(f.emisorReceptor))}</p>
            ${f.nifContraparte ? `<p style="font-size:11px;color:#6b7280;margin:2px 0 0 0">${t.nif}: ${escapeHtml(String(f.nifContraparte))}</p>` : ''}
          </div>
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0">
            <p style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;margin:0 0 4px 0">${t.fecha}</p>
            <p style="font-size:13px;font-weight:600;margin:0">${new Date(f.fechaEmision).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#059669;color:white">
              <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase">${t.concepto}</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase">${t.base_imponible}</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase">${t.iva}</th>
              <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase">${t.total}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb">
              <td style="padding:14px 16px;font-size:13px">${esGasto ? t.gasto : t.servicio} — ${escapeHtml(String(f.emisorReceptor))}</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px">${formatEuro(f.baseImponible)}</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px">${f.iva}%</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px;font-weight:700">${formatEuro(f.baseImponible + Math.round(f.baseImponible * (f.iva / 100)))}</td>
            </tr>
            ${importeDescuento > 0 ? `
            <tr style="border-bottom:1px solid #e5e7eb">
              <td style="padding:14px 16px;font-size:13px;color:#16a34a">${t.descuento} (${f.descuentoPorcentaje}%)</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px;color:#16a34a">-${formatEuro(importeDescuento)}</td>
              <td style="padding:14px 16px;text-align:right;font-size:13px"></td>
              <td style="padding:14px 16px;text-align:right;font-size:13px;font-weight:700;color:#16a34a">-${formatEuro(importeDescuento)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
        <div style="background:#059669;color:white;border-radius:12px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:14px;font-weight:600">${t.total.toUpperCase()}</span>
          <span style="font-size:24px;font-weight:800">${formatEuro(f.total)}</span>
        </div>
        ${f.pagosParciales && f.pagosParciales.length > 0 ? htmlPagosParciales(f.pagosParciales, f.total, f.idioma) : ''}
        ${f.notas ? `<div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:12px;margin-top:16px"><p style="font-size:11px;margin:0;color:#065f46"><strong>${t.notas}</strong> ${escapeHtml(String(f.notas))}</p></div>` : ''}
        ${htmlFirma(f.firmaBase64)}
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">
          <div style="font-size:9px;color:#9ca3af">
            <p style="margin:0">${escapeHtml(String(empresa))} · ${escapeHtml(String(direccion))} · ${t.nif} ${escapeHtml(String(nifEmpresa))}</p>
            <p style="margin:4px 0 0 0">${t.documento_generado_por}</p>
          </div>
          ${f.qrDataUrl ? `<div>${htmlQR(f.qrDataUrl, f.idioma)}</div>` : ''}
        </div>
      </div>
    </div>
  `
}

function htmlMinimalista(f: FacturaPDF): string {
  const esGasto = f.tipo === 'gasto'
  const t = obtenerTextosPDF(f.idioma)
  const tituloRectificativa = obtenerTituloRectificativa(f)
  const titulo = tituloRectificativa ?? (esGasto ? t.factura_recibida : t.factura_emitida)
  const empresa = f.empresaNombre || 'Mi Empresa S.L.'
  const direccion = f.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = f.empresaNif || 'B00000000'
  const importeDescuento = calcularImporteDescuento(f.baseImponible, f.descuentoPorcentaje ?? 0)
  const locale = f.idioma === 'en' ? 'en-GB' : 'es-ES'
  const clienteLabel = esGasto ? t.proveedor : t.cliente

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#000;padding:48px">
      <div style="margin-bottom:48px">
        ${f.logoBase64 ? `<div style="margin-bottom:16px">${htmlLogo(f.logoBase64)}</div>` : ''}
        <h1 style="font-size:32px;font-weight:300;margin:0;letter-spacing:4px">${titulo}</h1>
        <div style="display:flex;justify-content:space-between;margin-top:8px">
          <p style="font-size:12px;color:#999;margin:0">${t.numero} ${escapeHtml(String(f.numero))}</p>
          <p style="font-size:12px;color:#999;margin:0">${new Date(f.fechaEmision).toLocaleDateString(locale)}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:48px">
        <div>
          <p style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">${clienteLabel}</p>
          <p style="font-size:14px;font-weight:600;margin:0">${escapeHtml(String(f.emisorReceptor))}</p>
          ${f.nifContraparte ? `<p style="font-size:12px;color:#666;margin:4px 0 0 0">${escapeHtml(String(f.nifContraparte))}</p>` : ''}
        </div>
        <div>
          <p style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">${t.nif}</p>
          <p style="font-size:14px;font-weight:600;margin:0">${escapeHtml(String(empresa))}</p>
          <p style="font-size:12px;color:#666;margin:4px 0 0 0">${escapeHtml(String(nifEmpresa))}</p>
          <p style="font-size:12px;color:#666;margin:4px 0 0 0">${escapeHtml(String(direccion))}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
        <thead>
          <tr style="border-bottom:2px solid #000">
            <th style="padding:12px 0;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${t.concepto}</th>
            <th style="padding:12px 0;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${t.base_imponible}</th>
            <th style="padding:12px 0;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${t.iva}</th>
            <th style="padding:12px 0;text-align:right;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${t.total}</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:16px 0;font-size:13px">${esGasto ? t.gasto : t.servicio}</td>
            <td style="padding:16px 0;text-align:right;font-size:13px">${formatEuro(f.baseImponible)}</td>
            <td style="padding:16px 0;text-align:right;font-size:13px">${f.iva}%</td>
            <td style="padding:16px 0;text-align:right;font-size:13px;font-weight:600">${formatEuro(f.baseImponible + Math.round(f.baseImponible * (f.iva / 100)))}</td>
          </tr>
          ${importeDescuento > 0 ? `
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:16px 0;font-size:13px;color:#16a34a">${t.descuento} (${f.descuentoPorcentaje}%)</td>
            <td style="padding:16px 0;text-align:right;font-size:13px;color:#16a34a">-${formatEuro(importeDescuento)}</td>
            <td style="padding:16px 0;text-align:right;font-size:13px"></td>
            <td style="padding:16px 0;text-align:right;font-size:13px;font-weight:600;color:#16a34a">-${formatEuro(importeDescuento)}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
      <div style="text-align:right;margin-bottom:48px">
        <p style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px 0">${t.total_a_pagar}</p>
        <p style="font-size:36px;font-weight:200;margin:0">${formatEuro(f.total)}</p>
      </div>
      ${f.pagosParciales && f.pagosParciales.length > 0 ? htmlPagosParciales(f.pagosParciales, f.total, f.idioma) : ''}
      ${f.notas ? `<p style="font-size:11px;color:#666;margin:0 0 32px 0;border-top:1px solid #eee;padding-top:16px">${escapeHtml(String(f.notas))}</p>` : ''}
      ${htmlFirma(f.firmaBase64)}
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px">
        <div style="font-size:9px;color:#ccc;letter-spacing:1px">
          <p style="margin:0">${escapeHtml(String(empresa.toUpperCase()))} · ${escapeHtml(String(nifEmpresa))}</p>
        </div>
        ${f.qrDataUrl ? `<div>${htmlQR(f.qrDataUrl, f.idioma)}</div>` : ''}
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
  plantilla: PlantillaFactura = 'clasico',
  empresas: EmpresaDatos[] = []
): Promise<void> {
  const { logoBase64, firmaBase64 } = resolverLogoFirmaEmpresa(factura, empresas)
  // QR generado en local (antes: api.qrserver.com — enviaba el token del
  // portal a un tercero). Solo se genera si la factura tiene qrUrl.
  const qrDataUrl = factura.qrUrl
    ? await QRCode.toDataURL(factura.qrUrl, { margin: 1, width: 150 })
    : null
  const facturaResuelta: FacturaPDF = {
    ...factura,
    logoBase64: logoBase64 ?? factura.logoBase64,
    firmaBase64: firmaBase64 ?? factura.firmaBase64,
    qrDataUrl,
  }
  const htmlFn = plantillas[plantilla] ?? htmlClasico
  const html = htmlFn(facturaResuelta)
  await generarPDFDeHTML(html, `factura-${factura.numero}`, { orientacion: 'portrait' })
}
