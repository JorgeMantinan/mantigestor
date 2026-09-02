import JSZip from 'jszip'

export interface ExportData {
  facturas: Record<string, unknown>[]
  documentos: Record<string, unknown>[]
  nominas: Record<string, unknown>[]
  perfil: Record<string, unknown> | null
  propiedadesAlquiler: Record<string, unknown>[]
  auditLog: Record<string, unknown>[]
  notificaciones: Record<string, unknown>[]
}

export async function exportarTodoZIP(data: ExportData): Promise<void> {
  const zip = new JSZip()

  const toCsv = (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return ''
    const headers = Object.keys(rows[0]!)
    const lines = rows.map(r =>
      headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';')
    )
    return '\uFEFF' + headers.join(';') + '\n' + lines.join('\n')
  }

  zip.file('facturas.csv', toCsv(data.facturas))
  zip.file('documentos.csv', toCsv(data.documentos))
  zip.file('nominas.csv', toCsv(data.nominas))
  zip.file('propiedades_alquiler.csv', toCsv(data.propiedadesAlquiler))
  zip.file('audit_log.csv', toCsv(data.auditLog))
  zip.file('notificaciones.csv', toCsv(data.notificaciones))

  zip.file('perfil.json', JSON.stringify(data.perfil, null, 2))

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumen exportación</title></head><body>
    <h1>MantiGestor - Resumen de exportación</h1>
    <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
    <ul>
      <li>${data.facturas.length} facturas</li>
      <li>${data.documentos.length} documentos</li>
      <li>${data.nominas.length} nóminas</li>
      <li>${data.propiedadesAlquiler.length} propiedades de alquiler</li>
      <li>${data.auditLog.length} entradas de registro de actividad</li>
      <li>${data.notificaciones.length} notificaciones</li>
    </ul></body></html>`
  zip.file('resumen.html', html)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mantigestor-export-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
