import { celdaCsv } from './csv-seguro'

export function descargarCsv(filas: string[][], nombreFichero: string) {
  const csv = '\uFEFF' + filas.map(f => f.map(celdaCsv).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombreFichero
  a.click()
  URL.revokeObjectURL(url)
}
