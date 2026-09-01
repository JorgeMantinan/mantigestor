'use client'

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

export interface BancoInfo {
  id: BancoId
  nombre: string
  pais: string
  tipo: 'tradicional' | 'fintech' | 'neobanco' | 'pagos'
  logo?: string
}

export const BANCOS: Record<BancoId, BancoInfo> = {
  generico:     { id: 'generico',     nombre: 'Otro (genérico)',       pais: 'ES', tipo: 'tradicional' },
  sabadell:     { id: 'sabadell',     nombre: 'Banco Sabadell',        pais: 'ES', tipo: 'tradicional' },
  caixabank:    { id: 'caixabank',    nombre: 'CaixaBank',             pais: 'ES', tipo: 'tradicional' },
  abanca:       { id: 'abanca',       nombre: 'ABANCA',                pais: 'ES', tipo: 'tradicional' },
  bbva:         { id: 'bbva',         nombre: 'BBVA',                  pais: 'ES', tipo: 'tradicional' },
  santander:    { id: 'santander',    nombre: 'Santander',             pais: 'ES', tipo: 'tradicional' },
  ing:          { id: 'ing',          nombre: 'ING España',            pais: 'ES', tipo: 'tradicional' },
  bankinter:    { id: 'bankinter',    nombre: 'Bankinter',             pais: 'ES', tipo: 'tradicional' },
  openbank:     { id: 'openbank',     nombre: 'Openbank',              pais: 'ES', tipo: 'neobanco' },
  evo_banco:    { id: 'evo_banco',    nombre: 'EVO Banco',             pais: 'ES', tipo: 'neobanco' },
  revolut:      { id: 'revolut',      nombre: 'Revolut',               pais: 'EU', tipo: 'fintech' },
  n26:          { id: 'n26',          nombre: 'N26',                   pais: 'EU', tipo: 'neobanco' },
  trade_republic: { id: 'trade_republic', nombre: 'Trade Republic',    pais: 'EU', tipo: 'fintech' },
  wise:         { id: 'wise',         nombre: 'Wise (TransferWise)',   pais: 'EU', tipo: 'fintech' },
  bizum:        { id: 'bizum',        nombre: 'Bizum',                 pais: 'ES', tipo: 'pagos' },
}

// ============================================================
// DETECCIÓN AUTOMÁTICA DE BANCO POR CABECERAS
// ============================================================
export function detectarBanco(encabezados: string[]): BancoId {
  const h = encabezados.map(e => e.toLowerCase().trim().replace(/"/g, ''))

  // Revolut: "Type","Product","Started Date","Completed Date","Description","Amount","Fee","Currency","Balance"
  if (h.some(x => x.includes('started date')) && h.some(x => x.includes('completed date')) && h.some(x => x.includes('balance'))) {
    return 'revolut'
  }

  // N26: "Date","Payee","Account number","Type","Reference","Amount (EUR)","Currency","Closing balance"
  if (h.some(x => x === 'date' || x === 'fecha') && h.some(x => x.includes('closing balance') || x.includes('saldo final'))) {
    return 'n26'
  }

  // Wise: "Date","Type","Description","Payment Reference","Amount","Fee","Currency","Balance"
  if (h.some(x => x.includes('payment reference')) && h.some(x => x.includes('fee'))) {
    return 'wise'
  }

  // Trade Republic: "Datum","Empfänger","Konto","Buchungstyp","Verwendungszweck","Betrag","Währung","Saldo"
  if (h.some(x => x.includes('empfänger') || x.includes('betrag'))) {
    return 'trade_republic'
  }

  // Bizum: "Fecha","Concepto","Importe","Saldo"
  if (h.some(x => x.includes('bizum'))) {
    return 'bizum'
  }

  // BBVA: "Fecha Operación","Fecha Valor","Concepto","Importe","Saldo Disponible"
  if (h.some(x => x.includes('fecha operación') || x.includes('fecha operacion')) && h.some(x => x.includes('saldo disponible'))) {
    return 'bbva'
  }

  // Santander: "Fecha","Concepto","Importe","Saldo"
  if (h.some(x => x.includes('concepto')) && h.some(x => x.includes('saldo')) && h.length <= 5) {
    return 'santander'
  }

  // CaixaBank: "Fecha","Concepto/Histórico","Importe","Saldo"
  if (h.some(x => x.includes('histórico') || x.includes('historico'))) {
    return 'caixabank'
  }

  // Sabadell: "Fecha","Concepto","Importe","Divisa","Saldo"
  if (h.some(x => x.includes('divisa'))) {
    return 'sabadell'
  }

  // ABANCA: "Data","Concepto","Importe","Saldo"
  if (h.some(x => x === 'data') || h.some(x => x.includes('data') && x.includes('concepto'))) {
    return 'abanca'
  }

  // ING: "Fecha","Concepto","Importe","Saldo"
  if (h.some(x => x === 'fecha') && h.some(x => x === 'concepto') && h.some(x => x === 'importe') && h.some(x => x === 'saldo')) {
    return 'ing'
  }

  // Bankinter: "Fecha","Concepto","Importe","Saldo"
  if (h.some(x => x === 'fecha') && h.some(x => x.includes('concepto')) && h.some(x => x.includes('importe')) && h.some(x => x.includes('saldo'))) {
    return 'bankinter'
  }

  // Openbank: "Fecha","Descripción","Importe","Saldo"
  if (h.some(x => x.includes('descripción') || x.includes('descripcion'))) {
    return 'openbank'
  }

  // EVO Banco: "Fecha","Concepto","Importe","Saldo"
  if (h.some(x => x === 'fecha') && h.some(x => x.includes('concepto')) && h.some(x => x.includes('saldo'))) {
    return 'evo_banco'
  }

  // Generic fallback
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
    // Type=0, Product=1, StartedDate=2, CompletedDate=3, Description=4, Amount=5, Fee=6, Currency=7, Balance=8
    const fecha = normalizarFecha(valores[3] ?? valores[2] ?? '') // CompletedDate preferred
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
    // Date=0, Payee=1, AccountNumber=2, Type=3, Reference=4, Amount(EUR)=5, Currency=6, ClosingBalance=7
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
    // Date=0, Type=1, Description=2, PaymentReference=3, Amount=4, Fee=5, Currency=6, Balance=7
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
    // Fecha Operación=0, Fecha Valor=1, Concepto=2, Importe=3, Saldo Disponible=4
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
// UTILIDADES COMUNES
// ============================================================

function parsearLineaCSV(linea: string): string[] {
  return linea.split(/[;,]/).map(v => v.trim().replace(/^"|"$/g, ''))
}

function parsearImporte(str: string): number {
  let limpio = str.trim().replace(/"/g, '')
  // Detectar formato europeo: 1.234,56 → 1234.56
  if (limpio.includes(',') && limpio.includes('.')) {
    if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
      limpio = limpio.replace(/\./g, '').replace(',', '.')
    } else {
      limpio = limpio.replace(/,/g, '')
    }
  } else if (limpio.includes(',')) {
    limpio = limpio.replace(',', '.')
  }
  // Quitar espacios
  limpio = limpio.replace(/\s/g, '')
  const num = parseFloat(limpio)
  return isNaN(num) ? 0 : num
}

function normalizarFecha(fechaStr: string): string {
  if (!fechaStr) return ''

  // DD/MM/YYYY o DD-MM-YYYY
  const dmy = fechaStr.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y!.length === 2 ? '20' + y! : y!
    return `${year}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  // YYYY-MM-DD
  const ymd = fechaStr.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/)
  if (ymd) {
    const [, y, m, d] = ymd
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  // DD.MM.YYYY (formato alemán — Trade Republic)
  const dmyDot = fechaStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (dmyDot) {
    const [, d, m, y] = dmyDot
    const year = y!.length === 2 ? '20' + y! : y!
    return `${year}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }

  return ''
}

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
// PARSER PRINCIPAL — AUTO-DETECTA BANCO
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
// MATCHING — REUTILIZA LÓGICA ORIGINAL
// ============================================================

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
      } else if (diffImporte < 100) {
        puntuacion += 30
        motivos.push('importe casi exacto')
      } else if (diffImporte < 500) {
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
