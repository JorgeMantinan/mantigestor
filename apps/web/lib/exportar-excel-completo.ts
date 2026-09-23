import type { WorkBook, WorkSheet } from 'xlsx'

export interface FacturaExportable {
  numero: string
  tipo: string // 'ingreso' | 'gasto'
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string // ISO date (yyyy-mm-dd)
  baseImponible: number // céntimos
  iva: number // porcentaje: 0, 4, 10, 21
  total: number // céntimos
  estado: string
}

export interface NominaExportable {
  empleada: string
  mes: number // 1-12
  anyo: number
  salarioBruto: number // céntimos
  irpf: number // porcentaje
  seguridadSocial: number // céntimos
  neto: number // céntimos
}

export interface ExcelCompletoDatos {
  perfilNombre?: string
  facturas: FacturaExportable[]
  nominas: NominaExportable[]
}

interface OpcionesHoja {
  widths?: number[]
  currencyCols?: number[]
  percentCols?: number[]
  totalsRow?: (string | number)[]
}

const FORMATO_EURO = '#,##0.00" €"'
const FORMATO_PORCENTAJE = '0"%"'

const TIPOS_IVA = [21, 10, 4, 0]

function euros(cents: number): number {
  return Math.round(cents) / 100
}

function fechaValida(valor: string): Date | null {
  const fecha = new Date(valor)
  return isNaN(fecha.getTime()) ? null : fecha
}

function construirHoja(
  XLSX: typeof import('xlsx'),
  data: (string | number | Date | null)[][],
  opciones: OpcionesHoja = {}
): WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(data)
  const filas = Math.max(data.length - 1, 0)
  const columnas = data[0]?.length ?? 0

  const widths = opciones.widths ?? []
  ws['!cols'] = Array.from({ length: columnas }, (_, i) => {
    if (widths[i] !== undefined) return { wch: widths[i] }
    const maxLen = Math.max(
      String(data[0]?.[i] ?? '').length,
      ...Array.from({ length: filas }, (_, r) => String(data[r + 1]?.[i] ?? '').length)
    )
    return { wch: Math.min(maxLen + 3, 45) }
  })

  const formatarCelda = (row: number, col: number, formato: string) => {
    const ref = XLSX.utils.encode_cell({ r: row, c: col })
    const cell = ws[ref]
    if (cell && cell.t === 'n') cell.z = formato
  }

  for (let r = 1; r < data.length; r++) {
    for (const col of opciones.currencyCols ?? []) formatarCelda(r, col, FORMATO_EURO)
    for (const col of opciones.percentCols ?? []) formatarCelda(r, col, FORMATO_PORCENTAJE)
  }

  return ws
}

function hojaResumen(
  XLSX: typeof import('xlsx'),
  datos: ExcelCompletoDatos,
  totales: {
    emitidas: FacturaExportable[]
    recibidas: FacturaExportable[]
    ivasEmitidas: number
    ivasRecibidas: number
    brutoNominas: number
    netoNominas: number
    nominas: number
  }
): WorkSheet {
  const filas: (string | number)[][] = [
    ['Resumen de actividad'],
    ['', ''],
    ['Perfil', datos.perfilNombre ?? '—'],
    ['Generado', new Date().toLocaleDateString('es-ES')],
    ['', ''],
    ['Facturas emitidas', totales.emitidas.length],
    ['Importe emitido (base)', euros(totales.emitidas.reduce((s, f) => s + f.baseImponible, 0))],
    ['IVA repercutido', euros(totales.ivasEmitidas)],
    ['Total facturado', euros(totales.emitidas.reduce((s, f) => s + f.total, 0))],
    ['', ''],
    ['Facturas recibidas', totales.recibidas.length],
    ['Gastos (base)', euros(totales.recibidas.reduce((s, f) => s + f.baseImponible, 0))],
    ['IVA soportado', euros(totales.ivasRecibidas)],
    ['Total gastado', euros(totales.recibidas.reduce((s, f) => s + f.total, 0))],
    ['', ''],
    ['Liquidación IVA (repercutido - soportado)', euros(totales.ivasEmitidas - totales.ivasRecibidas)],
    ['', ''],
    ['Nóminas', totales.nominas],
    ['Salario bruto total', euros(totales.brutoNominas)],
    ['Salario neto total', euros(totales.netoNominas)],
  ]
  const ws = construirHoja(XLSX, filas, { widths: [42, 24] })
  for (let r = 3; r < filas.length; r++) {
    const label = String(filas[r]?.[0] ?? '')
    if (typeof filas[r]?.[1] === 'number' && !/facturas|nominas/i.test(label)) {
      const ref = XLSX.utils.encode_cell({ r, c: 1 })
      const cell = ws[ref]
      if (cell && cell.t === 'n') cell.z = FORMATO_EURO
    }
  }
  return ws
}

function construirFilaTotales(
  XLSX: typeof import('xlsx'),
  headers: string[],
  lastRow: number,
  sumCols: number[]
): (string | number)[] {
  const totales: (string | number)[] = []
  for (let c = 0; c < headers.length; c++) {
    if (c === 0) totales.push('TOTAL')
    else if (sumCols.includes(c)) {
      const letra = XLSX.utils.encode_col(c)
      totales.push({ f: `SUM(${letra}2:${letra}${lastRow})` } as unknown as string)
    } else totales.push('')
  }
  return totales
}

function hojaFacturas(
  XLSX: typeof import('xlsx'),
  facturas: FacturaExportable[]
): WorkSheet {
  const headers = ['Número', 'Contraparte', 'NIF', 'Fecha', 'Base (€)', 'IVA (%)', 'Cuota IVA (€)', 'Total (€)', 'Estado']
  const rows: (string | number | Date | null)[][] = facturas.map(f => {
    const cuotaIva = Math.round(f.baseImponible * (f.iva / 100))
    return [
      f.numero,
      f.emisorReceptor,
      f.nifContraparte ?? '',
      fechaValida(f.fechaEmision),
      euros(f.baseImponible),
      f.iva,
      euros(cuotaIva),
      euros(f.total),
      f.estado,
    ]
  })
  const lastRow = rows.length + 2
  const totalsRow = construirFilaTotales(XLSX, headers, lastRow, [4, 6, 7])

  return construirHoja(XLSX, [headers, ...rows, totalsRow], {
    widths: [14, 28, 14, 12, 14, 10, 14, 14, 12],
    currencyCols: [4, 6, 7],
    percentCols: [5],
  })
}

function hojaIva(
  XLSX: typeof import('xlsx'),
  emitidas: FacturaExportable[],
  recibidas: FacturaExportable[]
): WorkSheet {
  const headers = ['Tipo IVA (%)', 'Base repercutido (€)', 'Cuota repercutido (€)', 'Base soportado (€)', 'Cuota soportado (€)', 'Diferencia (€)']
  const rows: (string | number)[][] = TIPOS_IVA.map(tipo => {
    const baseRepercutido = emitidas.filter(f => f.iva === tipo).reduce((s, f) => s + f.baseImponible, 0)
    const baseSoportado = recibidas.filter(f => f.iva === tipo).reduce((s, f) => s + f.baseImponible, 0)
    const cuotaRepercutido = Math.round(baseRepercutido * (tipo / 100))
    const cuotaSoportado = Math.round(baseSoportado * (tipo / 100))
    return [tipo, euros(baseRepercutido), euros(cuotaRepercutido), euros(baseSoportado), euros(cuotaSoportado), euros(cuotaRepercutido - cuotaSoportado)]
  })

  const lastRow = rows.length + 2
  const totalsRow = construirFilaTotales(XLSX, headers, lastRow, [1, 2, 3, 4, 5])

  return construirHoja(XLSX, [headers, ...rows, totalsRow], {
    widths: [14, 20, 22, 20, 22, 18],
    currencyCols: [1, 2, 3, 4, 5],
    percentCols: [0],
  })
}

function hojaNominas(
  XLSX: typeof import('xlsx'),
  nominas: NominaExportable[]
): WorkSheet {
  const headers = ['Empleado/a', 'Periodo', 'Bruto (€)', 'IRPF (%)', 'Seg. Social (€)', 'Neto (€)']
  const rows: (string | number)[][] = nominas.map(n => [
    n.empleada,
    `${String(n.mes).padStart(2, '0')}/${n.anyo}`,
    euros(n.salarioBruto),
    n.irpf,
    euros(n.seguridadSocial),
    euros(n.neto),
  ])
  const lastRow = rows.length + 2
  const totalsRow = construirFilaTotales(XLSX, headers, lastRow, [2, 4, 5])

  return construirHoja(XLSX, [headers, ...rows, totalsRow], {
    widths: [24, 12, 14, 12, 16, 14],
    currencyCols: [2, 4, 5],
    percentCols: [3],
  })
}

export async function construirWorkbookCompleto(datos: ExcelCompletoDatos): Promise<WorkBook> {
  const XLSX = await import('xlsx')

  const emitidas = datos.facturas.filter(f => f.tipo === 'ingreso')
  const recibidas = datos.facturas.filter(f => f.tipo === 'gasto')

  const ivasEmitidas = emitidas.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const ivasRecibidas = recibidas.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const brutoNominas = datos.nominas.reduce((s, n) => s + n.salarioBruto, 0)
  const netoNominas = datos.nominas.reduce((s, n) => s + n.neto, 0)

  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    wb,
    hojaResumen(XLSX, datos, { emitidas, recibidas, ivasEmitidas, ivasRecibidas, brutoNominas, netoNominas, nominas: datos.nominas.length }),
    'Resumen'
  )
  XLSX.utils.book_append_sheet(wb, hojaFacturas(XLSX, emitidas), 'Facturas emitidas')
  XLSX.utils.book_append_sheet(wb, hojaFacturas(XLSX, recibidas), 'Facturas recibidas')
  XLSX.utils.book_append_sheet(wb, hojaIva(XLSX, emitidas, recibidas), 'IVA')
  XLSX.utils.book_append_sheet(wb, hojaNominas(XLSX, datos.nominas), 'Nóminas')

  return wb
}

export async function descargarExcelCompleto(
  datos: ExcelCompletoDatos,
  nombreFichero = `mantigestor-export-${new Date().toISOString().slice(0, 10)}.xlsx`
): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = await construirWorkbookCompleto(datos)
  XLSX.writeFile(wb, nombreFichero)
}
