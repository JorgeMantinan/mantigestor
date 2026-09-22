'use client'

export type BancoFormato = 'sabadell' | 'caixabank' | 'santander' | 'bbva' | 'generico'

export interface MovimientoBancoCSV {
  fecha: string
  concepto: string
  importe: number
  saldo: number | null
  referencia: string | null
}

interface BancoConfig {
  nombre: string
  separador: string
  encoding: string
  headerLine: number
  columns: {
    fecha: number
    concepto: number
    importe: number
    saldo?: number
    referencia?: number
  }
  formatDate: (raw: string) => string
  parseImporte: (raw: string) => number
}

const BANCOS_CONFIG: Record<BancoFormato, BancoConfig> = {
  sabadell: {
    nombre: 'Sabadell',
    separador: ';',
    encoding: 'utf-8',
    headerLine: 0,
    columns: { fecha: 0, concepto: 1, importe: 2, saldo: 3 },
    formatDate: (raw) => {
      const parts = raw.trim().split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${(parts[1] ?? '').padStart(2, '0')}-${(parts[0] ?? '').padStart(2, '0')}`
      }
      return raw.trim()
    },
    parseImporte: (raw) => {
      const clean = raw.replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
      return parseFloat(clean) || 0
    },
  },
  caixabank: {
    nombre: 'CaixaBank',
    separador: ';',
    encoding: 'utf-8',
    headerLine: 0,
    columns: { fecha: 0, concepto: 1, importe: 2, saldo: 3 },
    formatDate: (raw) => {
      const parts = raw.trim().split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${(parts[1] ?? '').padStart(2, '0')}-${(parts[0] ?? '').padStart(2, '0')}`
      }
      return raw.trim()
    },
    parseImporte: (raw) => {
      const clean = raw.replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
      return parseFloat(clean) || 0
    },
  },
  santander: {
    nombre: 'Santander',
    separador: ';',
    encoding: 'utf-8',
    headerLine: 0,
    columns: { fecha: 0, concepto: 1, importe: 2 },
    formatDate: (raw) => {
      const parts = raw.trim().split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${(parts[1] ?? '').padStart(2, '0')}-${(parts[0] ?? '').padStart(2, '0')}`
      }
      return raw.trim()
    },
    parseImporte: (raw) => {
      const clean = raw.replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
      return parseFloat(clean) || 0
    },
  },
  bbva: {
    nombre: 'BBVA',
    separador: ';',
    encoding: 'utf-8',
    headerLine: 0,
    columns: { fecha: 0, concepto: 1, importe: 2, saldo: 4 },
    formatDate: (raw) => {
      const parts = raw.trim().split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${(parts[1] ?? '').padStart(2, '0')}-${(parts[0] ?? '').padStart(2, '0')}`
      }
      return raw.trim()
    },
    parseImporte: (raw) => {
      const clean = raw.replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
      return parseFloat(clean) || 0
    },
  },
  generico: {
    nombre: 'Genérico',
    separador: ';',
    encoding: 'utf-8',
    headerLine: 0,
    columns: { fecha: 0, concepto: 1, importe: 2, saldo: 3 },
    formatDate: (raw) => {
      const parts = raw.trim().split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${(parts[1] ?? '').padStart(2, '0')}-${(parts[0] ?? '').padStart(2, '0')}`
      }
      return raw.trim()
    },
    parseImporte: (raw) => {
      const clean = raw.replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
      return parseFloat(clean) || 0
    },
  },
}

export function detectarBanco(texto: string): BancoFormato {
  const lower = texto.toLowerCase()
  if (lower.includes('sabadell')) return 'sabadell'
  if (lower.includes('caixabank') || lower.includes('la caixa')) return 'caixabank'
  if (lower.includes('santander') || lower.includes('bsantander')) return 'santander'
  if (lower.includes('bbva')) return 'bbva'
  return 'generico'
}

export function parsearCSV(texto: string, banco?: BancoFormato): MovimientoBancoCSV[] {
  const bancoDetectado = banco ?? detectarBanco(texto)
  const config = BANCOS_CONFIG[bancoDetectado]
  const lineas = texto.split('\n').filter(l => l.trim().length > 0)

  // Skip header lines
  const dataLines = lineas.slice(config.headerLine)

  return dataLines
    .map(line => {
      const cols = line.split(config.separador).map(c => c.trim())
      if (cols.length < 3) return null

      const fechaRaw = cols[config.columns.fecha]
      const concepto = cols[config.columns.concepto]
      const importeRaw = cols[config.columns.importe]
      const saldoRaw = config.columns.saldo !== undefined ? cols[config.columns.saldo] : undefined

      if (!fechaRaw || !concepto || !importeRaw) return null

      return {
        fecha: config.formatDate(fechaRaw),
        concepto,
        importe: config.parseImporte(importeRaw),
        saldo: saldoRaw ? config.parseImporte(saldoRaw) : null,
        referencia: config.columns.referencia !== undefined ? cols[config.columns.referencia] ?? null : null,
      }
    })
    .filter((m): m is MovimientoBancoCSV => m !== null)
}

export function parsearImporte(raw: string): number {
  const clean = raw.replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
  return parseFloat(clean) || 0
}

export function diasEntre(fecha1: string, fecha2: string): number {
  const d1 = new Date(fecha1)
  const d2 = new Date(fecha2)
  return Math.abs(Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)))
}

export function encontrarCoincidencias(
  movimientos: MovimientoBancoCSV[],
  facturas: { id: string; numero: string; emisorReceptor: string; fechaEmision: string; total: number; estado: string }[]
): { movimiento: MovimientoBancoCSV; factura: typeof facturas[0]; puntuacion: number }[] {
  const resultados: { movimiento: MovimientoBancoCSV; factura: typeof facturas[0]; puntuacion: number }[] = []

  for (const mov of movimientos) {
    if (mov.importe === 0) continue

    let mejorMatch: typeof facturas[0] | null = null
    let mejorPuntuacion = 0

    for (const fac of facturas) {
      if (fac.estado === 'pagada') continue

      let puntuacion = 0

      // Match por importe ±1%
      const diffImporte = Math.abs(Math.abs(mov.importe) - Math.abs(fac.total / 100))
      const pctDiff = diffImporte / Math.max(Math.abs(fac.total / 100), 1)
      if (pctDiff <= 0.01) {
        puntuacion += 50
      } else if (pctDiff <= 0.05) {
        puntuacion += 25
      }

      // Match por fecha ±3 días
      const dias = diasEntre(mov.fecha, fac.fechaEmision)
      if (dias === 0) {
        puntuacion += 30
      } else if (dias <= 3) {
        puntuacion += 20
      } else if (dias <= 7) {
        puntuacion += 10
      }

      // Match por concepto contiene número de factura
      if (mov.concepto.toLowerCase().includes(fac.numero.toLowerCase())) {
        puntuacion += 40
      }

      // Match por concepto contiene nombre del emisor/receptor
      if (mov.concepto.toLowerCase().includes(fac.emisorReceptor.toLowerCase())) {
        puntuacion += 20
      }

      if (puntuacion > mejorPuntuacion) {
        mejorPuntuacion = puntuacion
        mejorMatch = fac
      }
    }

    if (mejorMatch && mejorPuntuacion >= 30) {
      resultados.push({
        movimiento: mov,
        factura: mejorMatch,
        puntuacion: mejorPuntuacion,
      })
    }
  }

  return resultados.sort((a, b) => b.puntuacion - a.puntuacion)
}

export const BANCOS_DISPONIBLES: { id: BancoFormato; nombre: string }[] = [
  { id: 'sabadell', nombre: 'Sabadell' },
  { id: 'caixabank', nombre: 'CaixaBank' },
  { id: 'santander', nombre: 'Santander' },
  { id: 'bbva', nombre: 'BBVA' },
  { id: 'generico', nombre: 'Genérico' },
]
