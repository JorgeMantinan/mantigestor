/**
 * Modelo 236 — Declaración informativa de bienes y derechos en el extranjero.
 *
 * Obligatorio para residentes fiscales que posean bienes o derechos
 * en el extranjero cuyo valor supere los 50.000 €.
 * Fuentes: Art. 42.1.b Ley 58/2003, normativa AEAT.
 */

export interface CuentaBancariaExtranjero236 {
  /** Entidad financiera */
  entidad: string
  /** País de la entidad */
  pais: string
  /** IBAN de la cuenta */
  iban: string
  /** Saldo a 31 de diciembre (céntimos) */
  saldoFinalCents: number
  /** Saldo máximo durante el año (céntimos) */
  saldoMaximoCents: number
}

export interface InmuebleExtranjero236 {
  /** Dirección del inmueble */
  direccion: string
  /** País del inmueble */
  pais: string
  /** Valor de adquisición o valor comprobado (céntimos) */
  valorCents: number
}

export interface ValorExtranjero236 {
  /** Entidad o depositario */
  entidad: string
  /** País de la entidad */
  pais: string
  /** Valor a 31 de diciembre (céntimos) */
  valorFinalCents: number
}

export interface SeguroExtranjero236 {
  /** Entidad aseguradora */
  entidad: string
  /** País de la entidad */
  pais: string
  /** Capital o valor a 31 de diciembre (céntimos) */
  capitalCents: number
}

export interface BienesExtranjero236 {
  cuentasBancarias: CuentaBancariaExtranjero236[]
  inmuebles: InmuebleExtranjero236[]
  valores: ValorExtranjero236[]
  seguros: SeguroExtranjero236[]
}

export interface ResultadoModelo236 {
  totalCuentas: number
  totalInmuebles: number
  totalValores: number
  totalSeguros: number
  totalGlobal: number
  numEntidades: number
}

function sumarCuentas(cuentas: CuentaBancariaExtranjero236[]): number {
  let total = 0
  for (const c of cuentas) {
    total += c.saldoFinalCents
  }
  return total
}

function sumarInmuebles(inmuebles: InmuebleExtranjero236[]): number {
  let total = 0
  for (const i of inmuebles) {
    total += i.valorCents
  }
  return total
}

function sumarValores(valores: ValorExtranjero236[]): number {
  let total = 0
  for (const v of valores) {
    total += v.valorFinalCents
  }
  return total
}

function sumarSeguros(seguros: SeguroExtranjero236[]): number {
  let total = 0
  for (const s of seguros) {
    total += s.capitalCents
  }
  return total
}

export function calcularModelo236(
  bienes: BienesExtranjero236
): ResultadoModelo236 {
  const totalCuentas = sumarCuentas(bienes.cuentasBancarias)
  const totalInmuebles = sumarInmuebles(bienes.inmuebles)
  const totalValores = sumarValores(bienes.valores)
  const totalSeguros = sumarSeguros(bienes.seguros)

  const entidades = new Set<string>()

  for (const c of bienes.cuentasBancarias) {
    entidades.add(`${c.entidad}|${c.pais}`)
  }
  for (const i of bienes.inmuebles) {
    entidades.add(`${i.direccion}|${i.pais}`)
  }
  for (const v of bienes.valores) {
    entidades.add(`${v.entidad}|${v.pais}`)
  }
  for (const s of bienes.seguros) {
    entidades.add(`${s.entidad}|${s.pais}`)
  }

  return {
    totalCuentas,
    totalInmuebles,
    totalValores,
    totalSeguros,
    totalGlobal: totalCuentas + totalInmuebles + totalValores + totalSeguros,
    numEntidades: entidades.size,
  }
}
