import type { OcrResult } from './ocr'

export interface ResultadoValidacion {
  valido: boolean
  errores: string[]
  advertencias: string[]
  campos: CampoValidacion[]
}

export interface CampoValidacion {
  campo: string
  etiqueta: string
  valor: unknown
  valido: boolean
  error?: string
  advertencia?: string
  sugerencia?: string
}

const REGEX_NIF_PERSONA_FISICA = /^\d{8}[A-Z]$/i
const REGEX_NIF_PERSONA_JURIDICA = /^[A-HJ-NP-S]\d{7}[A-J0-9]$/i
const REGEX_NIE = /^[XYZ]\d{7}[A-Z]$/i
const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

const LETTER_NIF = 'TRWAGMYFPDXBNJZSQVHLCKE'

function calcularLetraNif(nif: string): string {
  const num = parseInt(nif.slice(0, 8), 10)
  if (isNaN(num)) return ''
  return LETTER_NIF[num % 23] ?? ''
}

export function validarNIF(nif: string | null | undefined): { valido: boolean; error?: string; sugerencia?: string } {
  if (!nif || nif.trim() === '') {
    return { valido: true }
  }

  const limpio = nif.trim().toUpperCase()

  if (REGEX_NIF_PERSONA_FISICA.test(limpio)) {
    const letra = limpio[8]!
    const esperada = calcularLetraNif(limpio)
    if (letra !== esperada) {
      return {
        valido: false,
        error: `Letra incorrecta: ${letra} (debería ser ${esperada})`,
        sugerencia: `${limpio.slice(0, 8)}${esperada}`,
      }
    }
    return { valido: true }
  }

  if (REGEX_NIF_PERSONA_JURIDICA.test(limpio)) {
    const digitoControl = limpio[8]!
    const suma = limpio.slice(1, 8).split('').reduce((acc, c, i) => {
      const n = parseInt(c, 10)
      return acc + (i % 2 === 0 ? n : thisOrSumDigits(n * 2))
    }, 0)
    const controlCalculado = (10 - (suma % 10)) % 10
    if (/[0-9]/.test(digitoControl) && parseInt(digitoControl, 10) !== controlCalculado) {
      return {
        valido: false,
        error: `Dígito de control incorrecto: ${digitoControl} (debería ser ${controlCalculado})`,
        sugerencia: `${limpio.slice(0, 8)}${controlCalculado}`,
      }
    }
    return { valido: true }
  }

  if (REGEX_NIE.test(limpio)) {
    const nieBody = limpio.slice(0, -1)
    const letra = limpio[8]!
    if (!nieBody || !letra) return { valido: false, error: 'Formato NIE inválido' }
    const letterMap: Record<string, string> = { X: '0', Y: '1', Z: '2' }
    const nifEquivalent = (letterMap[nieBody[0]!] ?? nieBody[0]!) + nieBody.slice(1)
    const esperada = calcularLetraNif(nifEquivalent)
    if (letra !== esperada) {
      return {
        valido: false,
        error: `Letra NIE incorrecta: ${letra} (debería ser ${esperada})`,
        sugerencia: `${limpio.slice(0, 8)}${esperada}`,
      }
    }
    return { valido: true }
  }

  return {
    valido: false,
    error: 'Formato de NIF/CIF/NIE no válido',
  }
}

function thisOrSumDigits(n: number): number {
  if (n < 10) return n
  return Math.floor(n / 10) + (n % 10)
}

export function validarFecha(fecha: string | null | undefined): { valido: boolean; error?: string; advertencia?: string } {
  if (!fecha || fecha.trim() === '') {
    return { valido: true }
  }

  const limpia = fecha.trim()

  if (!REGEX_FECHA_ISO.test(limpia)) {
    const matchEspanol = limpia.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4})$/)
    if (matchEspanol) {
      return {
        valido: true,
        advertencia: `Formato detectado DD/MM/YYYY — se guardará como ${matchEspanol[3]}-${matchEspanol[2]}-${matchEspanol[1]}`,
      }
    }
    return {
      valido: false,
      error: 'Formato de fecha no válido (se espera YYYY-MM-DD)',
    }
  }

  const parts = limpia.split('-').map(Number)
  const anio = parts[0] ?? 0
  const mes = parts[1] ?? 0
  const dia = parts[2] ?? 0
  const fechaObj = new Date(anio, mes - 1, dia)
  if (fechaObj.getFullYear() !== anio || fechaObj.getMonth() !== mes - 1 || fechaObj.getDate() !== dia) {
    return {
      valido: false,
      error: 'Fecha inexistente',
    }
  }

  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  if (fechaObj > hoy) {
    return {
      valido: true,
      advertencia: 'La fecha está en el futuro',
    }
  }

  const haceDosAnios = new Date()
  haceDosAnios.setFullYear(haceDosAnios.getFullYear() - 2)
  if (fechaObj < haceDosAnios) {
    return {
      valido: true,
      advertencia: 'La fecha tiene más de 2 años de antigüedad',
    }
  }

  return { valido: true }
}

export function validarBaseImponible(base: number | null | undefined): { valido: boolean; error?: string } {
  if (base === null || base === undefined) {
    return { valido: false, error: 'La base imponible es obligatoria' }
  }
  if (typeof base !== 'number' || isNaN(base)) {
    return { valido: false, error: 'La base imponible debe ser un número' }
  }
  if (base <= 0) {
    return { valido: false, error: 'La base imponible debe ser mayor que 0' }
  }
  if (base > 10_000_000) {
    return { valido: false, error: 'La base imponible parece excesivamente alta' }
  }
  return { valido: true }
}

export function validarIVA(iva: number | null | undefined): { valido: boolean; error?: string; advertencia?: string } {
  if (iva === null || iva === undefined) {
    return { valido: false, error: 'El IVA es obligatorio' }
  }
  const tiposValidos = [0, 4, 10, 21]
  if (!tiposValidos.includes(iva)) {
    return {
      valido: false,
      error: `IVA no válido (${iva}%). Debe ser 0, 4, 10 o 21`,
    }
  }
  return { valido: true }
}

export function validarNumeroFactura(numero: string | null | undefined): { valido: boolean; error?: string; advertencia?: string } {
  if (!numero || numero.trim() === '') {
    return { valido: false, error: 'El número de factura es obligatorio' }
  }
  const limpio = numero.trim()
  if (limpio.length > 50) {
    return { valido: true, advertencia: 'El número es inusualmente largo' }
  }
  return { valido: true }
}

export function validarEmisorReceptor(nombre: string | null | undefined): { valido: boolean; error?: string } {
  if (!nombre || nombre.trim() === '') {
    return { valido: false, error: 'El nombre del emisor/receptor es obligatorio' }
  }
  if (nombre.trim().length < 2) {
    return { valido: false, error: 'El nombre parece demasiado corto' }
  }
  return { valido: true }
}

function validarCoherenciaImportes(base: number | null, iva: number | null, total: number | null): string | undefined {
  if (base === null || iva === null || total === null) return undefined
  const totalCalculado = Math.round(base * (1 + iva / 100))
  const diferencia = Math.abs(total - totalCalculado)
  if (diferencia > 1) {
    return `El total (${total}) no coincide con base + IVA (${totalCalculado}). Diferencia: ${diferencia.toFixed(2)}`
  }
  return undefined
}

export function validarFactura(ocrResult: OcrResult): ResultadoValidacion {
  const errores: string[] = []
  const advertencias: string[] = []
  const campos: CampoValidacion[] = []

  const vNumero = validarNumeroFactura(ocrResult.numero)
  campos.push({
    campo: 'numero',
    etiqueta: 'Nº Factura',
    valor: ocrResult.numero,
    valido: vNumero.valido,
    error: vNumero.error,
    advertencia: vNumero.advertencia,
  })
  if (!vNumero.valido) errores.push(vNumero.error!)

  const vEmisor = validarEmisorReceptor(ocrResult.emisorReceptor)
  campos.push({
    campo: 'emisorReceptor',
    etiqueta: 'Emisor/Receptor',
    valor: ocrResult.emisorReceptor,
    valido: vEmisor.valido,
    error: vEmisor.error,
  })
  if (!vEmisor.valido) errores.push(vEmisor.error!)

  const vNif = validarNIF(ocrResult.nifContraparte)
  campos.push({
    campo: 'nifContraparte',
    etiqueta: 'NIF/CIF',
    valor: ocrResult.nifContraparte,
    valido: vNif.valido,
    error: vNif.error,
    sugerencia: vNif.sugerencia,
  })
  if (!vNif.valido) errores.push(vNif.error!)

  const vFecha = validarFecha(ocrResult.fechaEmision)
  campos.push({
    campo: 'fechaEmision',
    etiqueta: 'Fecha de emisión',
    valor: ocrResult.fechaEmision,
    valido: vFecha.valido,
    error: vFecha.error,
    advertencia: vFecha.advertencia,
  })
  if (!vFecha.valido) errores.push(vFecha.error!)
  if (vFecha.advertencia) advertencias.push(vFecha.advertencia)

  const vBase = validarBaseImponible(ocrResult.baseImponible)
  campos.push({
    campo: 'baseImponible',
    etiqueta: 'Base imponible',
    valor: ocrResult.baseImponible,
    valido: vBase.valido,
    error: vBase.error,
  })
  if (!vBase.valido) errores.push(vBase.error!)

  const vIva = validarIVA(ocrResult.iva)
  campos.push({
    campo: 'iva',
    etiqueta: 'IVA',
    valor: ocrResult.iva != null ? `${ocrResult.iva}%` : null,
    valido: vIva.valido,
    error: vIva.error,
    advertencia: vIva.advertencia,
  })
  if (!vIva.valido) errores.push(vIva.error!)
  if (vIva.advertencia) advertencias.push(vIva.advertencia)

  if (ocrResult.total != null && ocrResult.total <= 0) {
    campos.push({
      campo: 'total',
      etiqueta: 'Total',
      valor: ocrResult.total,
      valido: false,
      error: 'El total debe ser mayor que 0',
    })
    errores.push('El total debe ser mayor que 0')
  } else {
    campos.push({
      campo: 'total',
      etiqueta: 'Total',
      valor: ocrResult.total,
      valido: true,
    })
  }

  const advertenciaImportes = validarCoherenciaImportes(ocrResult.baseImponible, ocrResult.iva, ocrResult.total)
  if (advertenciaImportes) {
    advertencias.push(advertenciaImportes)
    const campoTotal = campos.find(c => c.campo === 'total')
    if (campoTotal) campoTotal.advertencia = advertenciaImportes
  }

  if (!ocrResult.tipo) {
    campos.push({
      campo: 'tipo',
      etiqueta: 'Tipo',
      valor: null,
      valido: false,
      error: 'No se pudo determinar el tipo (ingreso/gasto)',
    })
    errores.push('No se pudo determinar el tipo (ingreso/gasto)')
  } else {
    campos.push({
      campo: 'tipo',
      etiqueta: 'Tipo',
      valor: ocrResult.tipo === 'ingreso' ? 'Ingreso (emitida)' : 'Gasto (recibida)',
      valido: true,
    })
  }

  return {
    valido: errores.length === 0,
    errores,
    advertencias,
    campos,
  }
}
