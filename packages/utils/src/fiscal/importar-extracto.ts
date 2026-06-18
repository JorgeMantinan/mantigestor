import type { MovimientoBancario } from '@mantigestor/types'

export type FormatoExtracto =
  | 'csv_santander'
  | 'csv_bbva'
  | 'csv_caixabank'
  | 'csv_sabadell'
  | 'csv_bankia'
  | 'generico'

function parseFechaES(fechaStr: string): Date {
  const [dia, mes, año] = fechaStr.split(/[\/\-]/)
  return new Date(Number(año), Number(mes) - 1, Number(dia))
}

function eurosToCentimos(euroStr: string): number {
  const limpio = euroStr.replace(/\./g, '').replace(',', '.').replace('€', '').trim()
  return Math.round(parseFloat(limpio) * 100)
}

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
