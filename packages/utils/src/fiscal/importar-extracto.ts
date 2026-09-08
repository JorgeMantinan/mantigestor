import type { MovimientoBancario } from '@mantigestor/types'

// ============================================================
// BANCOS SOPORTADOS
// ============================================================
export type BancoId =
  | 'generico'
  | 'sabadell'
  | 'caixabank'
  | 'abanca'
  | 'bbva'
  | 'santander'
  | 'ing'
  | 'bankinter'
  | 'openbank'
  | 'evo_banco'
  | 'revolut'
  | 'n26'
  | 'trade_republic'
  | 'wise'
  | 'bizum'

export type FormatoExtracto =
  | 'csv_santander'
  | 'csv_bbva'
  | 'csv_caixabank'
  | 'csv_sabadell'
  | 'csv_bankia'
  | 'generico'

export interface BancoInfo {
  id: BancoId
  nombre: string
  pais: string
  tipo: 'tradicional' | 'fintech' | 'neobanco' | 'pagos'
}

export const BANCOS: Record<BancoId, BancoInfo> = {
  generico:       { id: 'generico',       nombre: 'Otro (genérico)',       pais: 'ES', tipo: 'tradicional' },
  sabadell:       { id: 'sabadell',       nombre: 'Banco Sabadell',        pais: 'ES', tipo: 'tradicional' },
  caixabank:      { id: 'caixabank',      nombre: 'CaixaBank',             pais: 'ES', tipo: 'tradicional' },
  abanca:         { id: 'abanca',         nombre: 'ABANCA',                pais: 'ES', tipo: 'tradicional' },
  bbva:           { id: 'bbva',           nombre: 'BBVA',                  pais: 'ES', tipo: 'tradicional' },
  santander:      { id: 'santander',      nombre: 'Santander',             pais: 'ES', tipo: 'tradicional' },
  ing:            { id: 'ing',            nombre: 'ING España',            pais: 'ES', tipo: 'tradicional' },
  bankinter:      { id: 'bankinter',      nombre: 'Bankinter',             pais: 'ES', tipo: 'tradicional' },
  openbank:       { id: 'openbank',       nombre: 'Openbank',              pais: 'ES', tipo: 'neobanco' },
  evo_banco:      { id: 'evo_banco',      nombre: 'EVO Banco',             pais: 'ES', tipo: 'neobanco' },
  revolut:        { id: 'revolut',        nombre: 'Revolut',               pais: 'EU', tipo: 'fintech' },
  n26:            { id: 'n26',            nombre: 'N26',                   pais: 'EU', tipo: 'neobanco' },
  trade_republic: { id: 'trade_republic', nombre: 'Trade Republic',        pais: 'EU', tipo: 'fintech' },
  wise:           { id: 'wise',           nombre: 'Wise (TransferWise)',   pais: 'EU', tipo: 'fintech' },
  bizum:          { id: 'bizum',          nombre: 'Bizum',                 pais: 'ES', tipo: 'pagos' },
}

// ============================================================
// INTERFACES COMPARTIDAS
// ============================================================

export interface LineaExtracto {
  fecha: string
  descripcion: string
  importe: number
  saldo?: number
  banco?: BancoId
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

// ============================================================
// UTILIDADES COMUNES
// ============================================================

export function parseFechaES(fechaStr: string): Date {
  const [dia, mes, año] = fechaStr.split(/[\/\-]/)
  return new Date(Number(año), Number(mes) - 1, Number(dia))
}

export function eurosToCentimos(euroStr: string): number {
  const limpio = euroStr.replace(/\./g, '').replace(',', '.').replace('€', '').trim()
  return Math.round(parseFloat(limpio) * 100)
}

export function parsearLineaCSV(linea: string): string[] {
  return linea.split(/[;,]/).map(v => v.trim().replace(/^"|"$/g, ''))
}

export function parsearImporte(str: string): number {
  let limpio = str.trim().replace(/"/g, '')
  if (limpio.includes(',') && limpio.includes('.')) {
    if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
      limpio = limpio.replace(/\./g, '').replace(',', '.')
    } else {
      limpio = limpio.replace(/,/g, '')
    }
  } else if (limpio.includes(',')) {
    limpio = limpio.replace(',', '.')
  }
  limpio = limpio.replace(/\s/g, '')
  const num = parseFloat(limpio)
  return isNaN(num) ? 0 : num
}

export function normalizarFecha(fechaStr: string): string {
  if (!fechaStr) return ''

  const dmy = fechaStr.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y!.length === 2 ? '20' + y! : y!
    return `${year}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  const ymd = fechaStr.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/)
  if (ymd) {
    const [, y, m, d] = ymd
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  const dmyDot = fechaStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (dmyDot) {
    const [, d, m, y] = dmyDot
    const year = y!.length === 2 ? '20' + y! : y!
    return `${year}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  return ''
}

// ============================================================
// DETECCIÓN AUTOMÁTICA DE BANCO POR CABECERAS
// ============================================================

export function detectarBanco(encabezados: string[]): BancoId {
  const h = encabezados.map(e => e.toLowerCase().trim().replace(/"/g, ''))

  if (h.some(x => x.includes('started date')) && h.some(x => x.includes('completed date')) && h.some(x => x.includes('balance'))) {
    return 'revolut'
  }
  if (h.some(x => x === 'date' || x === 'fecha') && h.some(x => x.includes('closing balance') || x.includes('saldo final'))) {
    return 'n26'
  }
  if (h.some(x => x.includes('payment reference')) && h.some(x => x.includes('fee'))) {
    return 'wise'
  }
  if (h.some(x => x.includes('empfänger') || x.includes('betrag'))) {
    return 'trade_republic'
  }
  if (h.some(x => x.includes('bizum'))) {
    return 'bizum'
  }
  if (h.some(x => x.includes('fecha operación') || x.includes('fecha operacion')) && h.some(x => x.includes('saldo disponible'))) {
    return 'bbva'
  }
  if (h.some(x => x.includes('concepto')) && h.some(x => x.includes('saldo')) && h.length <= 5) {
    return 'santander'
  }
  if (h.some(x => x.includes('histórico') || x.includes('historico'))) {
    return 'caixabank'
  }
  if (h.some(x => x.includes('divisa'))) {
    return 'sabadell'
  }
  if (h.some(x => x === 'data') || h.some(x => x.includes('data') && x.includes('concepto'))) {
    return 'abanca'
  }
  if (h.some(x => x === 'fecha') && h.some(x => x === 'concepto') && h.some(x => x === 'importe') && h.some(x => x === 'saldo')) {
    return 'ing'
  }
  if (h.some(x => x === 'fecha') && h.some(x => x.includes('concepto')) && h.some(x => x.includes('importe')) && h.some(x => x.includes('saldo'))) {
    return 'bankinter'
  }
  if (h.some(x => x.includes('descripción') || x.includes('descripcion'))) {
    return 'openbank'
  }
  if (h.some(x => x === 'fecha') && h.some(x => x.includes('concepto')) && h.some(x => x.includes('saldo'))) {
    return 'evo_banco'
  }

  return 'generico'
}

// ============================================================
// PARSERS ESPECÍFICOS POR BANCO
// ============================================================

function parsearRevolut(lineas: string[]): { fecha: string; descripcion: string; importe: number }[] {
  const resultado: { fecha: string; descripcion: string; importe: number }[] = []
  for (let i = 1; i < lineas.length; i++) {
    const valores = parsearLineaCSV(lineas[i]!)
    if (valores.length < 8) continue
    const fecha = normalizarFecha(valores[3] ?? valores[2] ?? '')
    const descripcion = valores[4] ?? ''
    const importe = parsearImporte(valores[5] ?? '0')
    if (fecha && importe !== 0) {
      resultado.push({ fecha, descripcion, importe: Math.round(importe * 100) })
    }
  }
  return resultado
}

function parsearN26(lineas: string[]): { fecha: string; descripcion: string; importe: number }[] {
  const resultado: { fecha: string; descripcion: string; importe: number }[] = []
  for (let i = 1; i < lineas.length; i++) {
    const valores = parsearLineaCSV(lineas[i]!)
    if (valores.length < 7) continue
    const fecha = normalizarFecha(valores[0] ?? '')
    const descripcion = [valores[1], valores[3], valores[4]].filter(Boolean).join(' ')
    const importe = parsearImporte(valores[5] ?? '0')
    if (fecha && importe !== 0) {
      resultado.push({ fecha, descripcion, importe: Math.round(importe * 100) })
    }
  }
  return resultado
}

function parsearWise(lineas: string[]): { fecha: string; descripcion: string; importe: number }[] {
  const resultado: { fecha: string; descripcion: string; importe: number }[] = []
  for (let i = 1; i < lineas.length; i++) {
    const valores = parsearLineaCSV(lineas[i]!)
    if (valores.length < 8) continue
    const fecha = normalizarFecha(valores[0] ?? '')
    const descripcion = valores[2] ?? ''
    const importe = parsearImporte(valores[4] ?? '0')
    if (fecha && importe !== 0) {
      resultado.push({ fecha, descripcion, importe: Math.round(importe * 100) })
    }
  }
  return resultado
}

function parsearBBVA(lineas: string[]): { fecha: string; descripcion: string; importe: number }[] {
  const resultado: { fecha: string; descripcion: string; importe: number }[] = []
  for (let i = 1; i < lineas.length; i++) {
    const valores = parsearLineaCSV(lineas[i]!)
    if (valores.length < 5) continue
    const fecha = normalizarFecha(valores[0] ?? valores[1] ?? '')
    const descripcion = valores[2] ?? ''
    const importe = parsearImporte(valores[3] ?? '0')
    if (fecha && importe !== 0) {
      resultado.push({ fecha, descripcion, importe: Math.round(importe * 100) })
    }
  }
  return resultado
}

function parsearGenericoBanco(lineas: string[]): { fecha: string; descripcion: string; importe: number }[] {
  const resultado: { fecha: string; descripcion: string; importe: number }[] = []
  if (lineas.length < 2) return resultado

  const encabezados = parsearLineaCSV(lineas[0]!).map(h => h.toLowerCase().trim())
  const fechaIdx = encabezados.findIndex(h => h.includes('fecha') || h.includes('date') || h === 'data')
  const descIdx = encabezados.findIndex(h => h.includes('concepto') || h.includes('descri') || h.includes('description') || h.includes('detail') || h.includes('histórico'))
  const importeIdx = encabezados.findIndex(h => h.includes('importe') || h.includes('amount') || h.includes('cargo') || h.includes('abono') || h.includes('betrag'))

  if (fechaIdx === -1 || importeIdx === -1) return resultado

  for (let i = 1; i < lineas.length; i++) {
    const valores = parsearLineaCSV(lineas[i]!)
    if (valores.length <= Math.max(fechaIdx, importeIdx)) continue
    const fecha = normalizarFecha(valores[fechaIdx] ?? '')
    const descripcion = descIdx >= 0 ? (valores[descIdx] ?? '') : ''
    const importe = parsearImporte(valores[importeIdx] ?? '0')
    if (fecha && importe !== 0) {
      resultado.push({ fecha, descripcion, importe: Math.round(importe * 100) })
    }
  }
  return resultado
}

// ============================================================
// PARSER PRINCIPAL — AUTO-DETECTA BANCO (para conciliación)
// ============================================================

export function parsearExtractoCSV(
  texto: string,
  bancoManual?: BancoId
): { lineas: LineaExtracto[]; bancoDetectado: BancoId } {
  const lineasRaw = texto.split('\n').filter(l => l.trim())
  if (lineasRaw.length < 2) return { lineas: [], bancoDetectado: 'generico' }

  const encabezados = parsearLineaCSV(lineasRaw[0]!)
  const banco = bancoManual ?? detectarBanco(encabezados)

  let parseados: { fecha: string; descripcion: string; importe: number }[]

  switch (banco) {
    case 'revolut':
      parseados = parsearRevolut(lineasRaw)
      break
    case 'n26':
      parseados = parsearN26(lineasRaw)
      break
    case 'wise':
      parseados = parsearWise(lineasRaw)
      break
    case 'bbva':
      parseados = parsearBBVA(lineasRaw)
      break
    default:
      parseados = parsearGenericoBanco(lineasRaw)
      break
  }

  return {
    lineas: parseados.map(p => ({ ...p, banco })),
    bancoDetectado: banco,
  }
}

// ============================================================
// MATCHING — ENCONTRAR COINCIDENCIAS
// ============================================================

export function diasEntre(fecha1: string, fecha2: string): number {
  const d1 = new Date(fecha1)
  const d2 = new Date(fecha2)
  return Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

export function calcularSimilitud(a: string, b: string): number {
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

      const diffImporte = Math.abs(linea.importe - factura.total)
      if (diffImporte === 0) {
        puntuacion += 40
        motivos.push('importe exacto')
      } else if (diffImporte < 100) {
        puntuacion += 30
        motivos.push('importe casi exacto')
      } else if (diffImporte < 500) {
        puntuacion += 15
        motivos.push('importe similar')
      }

      const dias = diasEntre(linea.fecha, factura.fechaEmision)
      if (dias === 0) { puntuacion += 30; motivos.push('misma fecha') }
      else if (dias <= 3) { puntuacion += 25; motivos.push(`${Math.round(dias)} días diferencia`) }
      else if (dias <= 7) { puntuacion += 15; motivos.push(`${Math.round(dias)} días diferencia`) }
      else if (dias <= 30) { puntuacion += 5 }

      const similitud = calcularSimilitud(linea.descripcion, factura.emisorReceptor)
      if (similitud > 0.5) { puntuacion += 20; motivos.push('nombre similar') }
      else if (similitud > 0.2) { puntuacion += 10; motivos.push('palabras en común') }

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

// ============================================================
// PARSER LEGACY — FORMATO EXTRACTO (para importar-extracto page)
// ============================================================

const PARSERS: Record<FormatoExtracto, (csv: string) => MovimientoBancario[]> = {
  csv_santander: (csv) => {
    const lineas = csv.split('\n').slice(6)
    return lineas.filter(Boolean).map(l => {
      const partes = l.split(';')
      return {
        fecha: parseFechaES((partes[0] ?? '').trim()),
        concepto: (partes[1] ?? '').trim(),
        importe: eurosToCentimos((partes[2] ?? '').trim()),
        saldo: eurosToCentimos((partes[3] ?? '').trim()),
        referencia: null
      }
    })
  },

  csv_bbva: (csv) => {
    const lineas = csv.split('\n').slice(1)
    return lineas.filter(Boolean).map(l => {
      const partes = l.split(';')
      return {
        fecha: parseFechaES(partes[0]!.trim()),
        concepto: partes[2]!.trim(),
        importe: eurosToCentimos(partes[3]!.trim()),
        saldo: eurosToCentimos(partes[4]!.trim()),
        referencia: null
      }
    })
  },

  csv_caixabank: (csv) => {
    const lineas = csv.split('\n').slice(1)
    return lineas.filter(Boolean).map(l => {
      const partes = l.split(';').map(p => p.replace(/"/g, '').trim())
      return {
        fecha: parseFechaES(partes[0]!),
        concepto: partes[1]!,
        importe: eurosToCentimos(partes[2]!),
        saldo: eurosToCentimos(partes[3]!),
        referencia: null
      }
    })
  },

  csv_sabadell: (csv) => {
    const lineas = csv.split('\n').slice(1)
    return lineas.filter(Boolean).map(l => {
      const partes = l.split(';')
      return {
        fecha: parseFechaES(partes[0]!.trim()),
        concepto: partes[2]!.trim(),
        importe: eurosToCentimos(partes[3]!.trim()),
        saldo: eurosToCentimos(partes[4]?.trim() ?? '0'),
        referencia: partes[1]?.trim() ?? null
      }
    })
  },

  csv_bankia: (csv) => {
    const lineas = csv.split('\n').slice(2)
    return lineas.filter(Boolean).map(l => {
      const partes = l.split(';')
      return {
        fecha: parseFechaES(partes[0]!.trim()),
        concepto: partes[1]!.trim(),
        importe: eurosToCentimos(partes[2]!.trim()),
        saldo: eurosToCentimos(partes[3]?.trim() ?? '0'),
        referencia: null
      }
    })
  },

  generico: (csv) => {
    const separador = csv.includes(';') ? ';' : ','
    const lineas = csv.split('\n').slice(1)
    return lineas.filter(Boolean).map(l => {
      const partes = l.split(separador)
      return {
        fecha: parseFechaES(partes[0]?.trim() ?? ''),
        concepto: partes[1]?.trim() ?? '',
        importe: eurosToCentimos(partes[2]?.trim() ?? '0'),
        saldo: eurosToCentimos(partes[3]?.trim() ?? '0'),
        referencia: null
      }
    })
  }
}

export function parsearExtracto(
  csv: string,
  formato: FormatoExtracto
): MovimientoBancario[] {
  return PARSERS[formato](csv)
}
