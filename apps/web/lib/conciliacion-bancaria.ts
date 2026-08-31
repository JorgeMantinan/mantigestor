'use client'

export interface LineaExtracto {
  fecha: string
  descripcion: string
  importe: number
  saldo?: number
}

export interface LineaFactura {
  id: string
  fechaEmision: string
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  total: number
  estado: string
  tipo: string
}

export interface Coincidencia {
  extracto: LineaExtracto
  factura: LineaFactura
  puntuacion: number
  motivo: string
}

const MESES_ES: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
  jan: 0, feb2: 1, mar2: 2, apr: 3, jun2: 5,
  jul2: 6, aug: 7, sep2: 8, oct2: 9, nov2: 10, dec: 11,
}

export function parsearExtractoCSV(texto: string): LineaExtracto[] {
  const lineas = texto.split('\n').filter(l => l.trim())
  if (lineas.length < 2) return []

  const encabezados = lineas[0]!.split(/[;,]/).map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const fechaIdx = encabezados.findIndex(h => h.includes('fecha') || h.includes('date'))
  const descIdx = encabezados.findIndex(h => h.includes('concepto') || h.includes('descri') || h.includes('description') || h.includes('detail'))
  const importeIdx = encabezados.findIndex(h => h.includes('importe') || h.includes('amount') || h.includes('cargo') || h.includes('abono'))

  if (fechaIdx === -1 || importeIdx === -1) return []

  const resultado: LineaExtracto[] = []
  for (let i = 1; i < lineas.length; i++) {
    const valores = lineas[i]!.split(/[;,]/).map(v => v.trim().replace(/"/g, ''))
    if (valores.length <= Math.max(fechaIdx, importeIdx)) continue

    const fecha = normalizarFecha(valores[fechaIdx]!)
    const importeStr = valores[importeIdx]!.replace(/\./g, '').replace(',', '.')
    const importe = parseFloat(importeStr)
    if (isNaN(importe) || !fecha) continue

    resultado.push({
      fecha,
      descripcion: descIdx >= 0 ? (valores[descIdx] ?? '') : '',
      importe: Math.round(importe * 100),
    })
  }

  return resultado
}

function normalizarFecha(fechaStr: string): string {
  // Try DD/MM/YYYY
  const dmy = fechaStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y!.length === 2 ? '20' + y! : y!
    return `${year}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  // Try YYYY-MM-DD
  const ymd = fechaStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (ymd) {
    const [, y, m, d] = ymd
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  return ''
}

function diasEntre(fecha1: string, fecha2: string): number {
  const d1 = new Date(fecha1)
  const d2 = new Date(fecha2)
  return Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

function calcularSimilitud(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/)
  const wordsB = b.toLowerCase().split(/\s+/)
  const intersection = wordsA.filter(w => wordsB.includes(w))
  return intersection.length / Math.max(wordsA.length, wordsB.length)
}

export function encontrarCoincidencias(
  extracto: LineaExtracto[],
  facturas: LineaFactura[],
  umbralMinimo: number = 40
): Coincidencia[] {
  const coincidencias: Coincidencia[] = []
  const facturasUsadas = new Set<string>()

  for (const linea of extracto) {
    let mejorPuntuacion = 0
    let mejorFactura: LineaFactura | null = null
    let mejorMotivo = ''

    for (const factura of facturas) {
      if (facturasUsadas.has(factura.id)) continue
      if (factura.estado === 'pagada') continue

      let puntuacion = 0
      const motivos: string[] = []

      // Importe exacto (40 puntos)
      const diffImporte = Math.abs(linea.importe - factura.total)
      if (diffImporte === 0) {
        puntuacion += 40
        motivos.push('importe exacto')
      } else if (diffImporte < 100) { // < 1€
        puntuacion += 30
        motivos.push('importe casi exacto')
      } else if (diffImporte < 500) { // < 5€
        puntuacion += 15
        motivos.push('importe similar')
      }

      // Proximidad temporal (30 puntos)
      const dias = diasEntre(linea.fecha, factura.fechaEmision)
      if (dias === 0) { puntuacion += 30; motivos.push('misma fecha') }
      else if (dias <= 3) { puntuacion += 25; motivos.push(`${Math.round(dias)} días diferencia`) }
      else if (dias <= 7) { puntuacion += 15; motivos.push(`${Math.round(dias)} días diferencia`) }
      else if (dias <= 30) { puntuacion += 5 }

      // Similitud de texto (20 puntos)
      const similitud = calcularSimilitud(linea.descripcion, factura.emisorReceptor)
      if (similitud > 0.5) { puntuacion += 20; motivos.push('nombre similar') }
      else if (similitud > 0.2) { puntuacion += 10; motivos.push('palabras en común') }

      // Tipo correcto (10 puntos)
      if ((linea.importe > 0 && factura.tipo === 'ingreso') || (linea.importe < 0 && factura.tipo === 'gasto')) {
        puntuacion += 10
        motivos.push('tipo correcto')
      }

      if (puntuacion > mejorPuntuacion) {
        mejorPuntuacion = puntuacion
        mejorFactura = factura
        mejorMotivo = motivos.join(', ')
      }
    }

    if (mejorFactura && mejorPuntuacion >= umbralMinimo) {
      coincidencias.push({
        extracto: linea,
        factura: mejorFactura,
        puntuacion: mejorPuntuacion,
        motivo: mejorMotivo,
      })
      facturasUsadas.add(mejorFactura.id)
    }
  }

  return coincidencias.sort((a, b) => b.puntuacion - a.puntuacion)
}
