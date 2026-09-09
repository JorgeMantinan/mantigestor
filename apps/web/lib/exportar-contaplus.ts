export function exportarContaplus(facturas: Array<{
  fechaEmision: string
  numero: string
  nifContraparte: string | null
  emisorReceptor: string
  baseImponible: number
  iva: number
  total: number
  categoriaGasto: string | null
}>): string {
  const header = 'Fecha;Tipo;Numero;NIF;Cliente;Base;IVA;Total;Categoria'
  const rows = facturas.map(f =>
    `${f.fechaEmision};FAC;${f.numero};${f.nifContraparte || ''};${f.emisorReceptor};${(f.baseImponible / 100).toFixed(2)};${(f.iva / 100).toFixed(2)};${(f.total / 100).toFixed(2)};${f.categoriaGasto || ''}`
  )
  return [header, ...rows].join('\n')
}

export function exportarSage(facturas: Array<{
  fechaEmision: string
  numero: string
  emisorReceptor: string
  baseImponible: number
  iva: number
  total: number
}>): string {
  const header = 'Date;Reference;Third Party;Debit;Credit;Label'
  const rows = facturas.map(f => {
    const fecha = f.fechaEmision.split('-').reverse().join('/')
    const base = f.baseImponible / 100
    const total = f.total / 100
    return `${fecha};${f.numero};${f.emisorReceptor};${base.toFixed(2)};${total.toFixed(2)};${f.emisorReceptor} - ${f.numero}`
  })
  return [header, ...rows].join('\n')
}

export function descargarCSV(contenido: string, nombreArchivo: string) {
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  link.click()
  URL.revokeObjectURL(url)
}
