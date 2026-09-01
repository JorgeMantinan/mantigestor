'use client'

interface FacturaExport {
  numero: string
  tipo: string
  emisorReceptor: string
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
}

export async function exportarTodoZIP(facturas: FacturaExport[]): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  // Excel de facturas como CSV
  const headers = ['Fecha', 'Tipo', 'Nº Factura', 'Contraparte', 'Base Imponible', 'IVA', 'Total', 'Estado']
  const rows = facturas.map(f => [
    f.fechaEmision.slice(0, 10),
    f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
    f.numero,
    f.emisorReceptor,
    f.baseImponible.toFixed(2),
    f.iva.toFixed(2),
    f.total.toFixed(2),
    f.estado,
  ])
  const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n')
  zip.file('facturas.csv', csvContent)

  // Resumen como HTML
  const totalIngresos = facturas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
  const totalGastos = facturas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)
  const formatEuro = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c / 100)

  const resumenHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Resumen - MantiGestor</title>
<style>body{font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a}
h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:20px}
th,td{padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:left}
th{background:#f3f4f6;font-weight:600}.total{font-weight:bold;border-top:2px solid #333}</style>
</head><body>
<h1>Resumen fiscal</h1>
<p>Generado el ${new Date().toLocaleDateString('es-ES')}</p>
<table>
<tr><td>Total facturas</td><td>${facturas.length}</td></tr>
<tr><td>Ingresos</td><td>${formatEuro(totalIngresos)}</td></tr>
<tr><td>Gastos</td><td>${formatEuro(totalGastos)}</td></tr>
<tr class="total"><td>Beneficio</td><td>${formatEuro(totalIngresos - totalGastos)}</td></tr>
</table>
</body></html>`
  zip.file('resumen.html', resumenHtml)

  // Descargar
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mantigestor-export-${new Date().toISOString().slice(0, 10)}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
