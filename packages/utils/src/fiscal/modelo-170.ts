/**
 * Modelo 170 — Declaración informativa de las operaciones de cobro realizadas
 * mediante tarjetas y, desde 2026, pagos asociados a números de teléfono móvil.
 *
 * Dos versiones oficiales (cambio de ejercicio contemplado):
 * - Ejercicio ≤ 2025: Orden EHA/97/2010 — «Declaración informativa ANUAL de las
 *   operaciones realizadas por los empresarios o profesionales adheridos al sistema
 *   de gestión de cobros a través de tarjetas de crédito o de débito». Plazo: mes de
 *   febrero del año siguiente (art. 6, mod. Orden HAP/2835/2015). Derogada con
 *   efectos 1-ene-2026 por la Orden HAC/747/2025 (BOE 15-7-2025).
 * - Ejercicio ≥ 2026: Orden HAC/747/2025 — «Declaración informativa MENSUAL de las
 *   operaciones realizadas... a través de cualquier tipo de tarjeta y mediante pagos
 *   asociados a números de teléfono móvil». Plazo: mes natural siguiente al que se
 *   refiera la declaración. Primera aplicación: mes de enero de 2026 (presentado en
 *   febrero de 2026). Desde 2026 el ámbito subjetivo se amplía a entidades de pago,
 *   de dinero electrónico, sucursales y entidades en libre prestación de servicios.
 */

export type MedioCobro170 = 'tarjeta' | 'movil'

export interface Operacion170 {
  /** Fecha de la operación (ISO, YYYY-MM-DD) */
  fecha: string
  /** Importe cobrado en céntimos */
  importeCents: number
  medio: MedioCobro170
}

export interface DatosModelo170 {
  anyo: number
  /** Mes de la declaración (1-12). Solo aplica en la versión mensual (≥ 2026) */
  mes?: number
  operaciones: Operacion170[]
}

export interface ResultadoModelo170 {
  /** 'anual' para ejercicios ≤ 2025; 'mensual' desde 2026 */
  version: 'anual' | 'mensual'
  anyo: number
  /** Mes declarado (solo versión mensual) */
  mes: number | null
  /** Plazo oficial de presentación */
  plazo: string
  /** Total declarado en céntimos */
  totalCents: number
  totalTarjetaCents: number
  totalMovilCents: number
  numOperaciones: number
  /** Importes por mes (0-11), útiles en la versión anual */
  porMes: number[]
  avisos: string[]
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function calcularModelo170(datos: DatosModelo170): ResultadoModelo170 {
  const mensual = datos.anyo >= 2026
  const version: 'anual' | 'mensual' = mensual ? 'mensual' : 'anual'
  const avisos: string[] = []

  const mes = mensual ? datos.mes ?? null : null
  if (mensual && (mes === null || mes < 1 || mes > 12)) {
    avisos.push('En el ejercicio 2026 y siguientes el modelo 170 se presenta por mes: selecciona el mes de la declaración.')
  }
  if (!mensual && datos.mes !== undefined && datos.mes !== null) {
    avisos.push('Hasta el ejercicio 2025 el modelo 170 era una declaración anual: el mes seleccionado no se tiene en cuenta.')
  }

  const porMes = new Array<number>(12).fill(0)
  let totalTarjetaCents = 0
  let totalMovilCents = 0
  let numOperaciones = 0

  for (const op of datos.operaciones) {
    const fecha = new Date(op.fecha)
    if (Number.isNaN(fecha.getTime()) || fecha.getFullYear() !== datos.anyo) continue
    const mesOp = fecha.getMonth() + 1
    if (mensual) {
      if (mes === null || mesOp !== mes) continue
    }
    if (op.medio === 'movil' && !mensual) {
      avisos.push('Los pagos asociados a números de teléfono móvil solo se declaran en el modelo 170 desde el ejercicio 2026.')
      continue
    }
    const importe = Math.max(0, op.importeCents)
    porMes[mesOp - 1] = (porMes[mesOp - 1] ?? 0) + importe
    if (op.medio === 'movil') totalMovilCents += importe
    else totalTarjetaCents += importe
    numOperaciones += 1
  }

  const plazo = mensual
    ? 'Mes natural siguiente al que se refiera la declaración'
    : `Mes de febrero de ${datos.anyo + 1} (operaciones del año ${datos.anyo})`

  if (mensual && mes !== null) {
    avisos.push(`Declaración mensual del modelo 170: ${MESES[mes - 1] ?? ''} de ${datos.anyo}.`)
  }

  return {
    version,
    anyo: datos.anyo,
    mes,
    plazo,
    totalCents: totalTarjetaCents + totalMovilCents,
    totalTarjetaCents,
    totalMovilCents,
    numOperaciones,
    porMes,
    avisos,
  }
}
