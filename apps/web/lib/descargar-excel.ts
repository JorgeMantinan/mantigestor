import * as XLSX from 'xlsx'

export function descargarExcel(
  headers: string[],
  rows: (string | number)[][],
  nombreFichero: string,
  sheetName = 'Datos'
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Auto-width columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, nombreFichero)
}

export interface SheetData {
  name: string
  headers: string[]
  rows: (string | number)[][]
}

export function descargarExcelMultiplesHojas(
  sheets: SheetData[],
  nombreFichero: string
) {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const data = [sheet.headers, ...sheet.rows]
    const ws = XLSX.utils.aoa_to_sheet(data)

    // Auto-width columns
    const colWidths = sheet.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...sheet.rows.map(r => String(r[i] ?? '').length)
      )
      return { wch: Math.min(maxLen + 2, 40) }
    })
    ws['!cols'] = colWidths

    // Add totals row if numeric data exists
    const lastDataRow = sheet.rows.length + 1
    const totalsRow: (string | number)[] = ['TOTAL']
    for (let col = 1; col < sheet.headers.length; col++) {
      const isNumeric = sheet.rows.some(r => typeof r[col] === 'number' || (typeof r[col] === 'string' && !isNaN(parseFloat(r[col] as string))))
      if (isNumeric) {
        const colLetter = XLSX.utils.encode_col(col)
        totalsRow.push({ f: `SUM(${colLetter}2:${colLetter}${lastDataRow})` } as unknown as string)
      } else {
        totalsRow.push('')
      }
    }
    const totalsData = [...data, totalsRow]
    const wsWithTotals = XLSX.utils.aoa_to_sheet(totalsData)
    wsWithTotals['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, wsWithTotals, sheet.name)
  }

  XLSX.writeFile(wb, nombreFichero)
}

export function descargarExcelConResumen(
  headers: string[],
  rows: (string | number)[][],
  resumen: { label: string; value: string | number }[],
  nombreFichero: string,
  sheetName = 'Datos'
) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Resumen
  const resumenData = [
    ['RESUMEN', ''],
    ...resumen.map(r => [r.label, r.value]),
    ['', ''],
    [new Date().toLocaleDateString('es-ES'), `Generado por MantiGestor`],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 30 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // Sheet 2: Datos detallados
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  XLSX.writeFile(wb, nombreFichero)
}
