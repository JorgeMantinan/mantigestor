/**
 * Modelo 216 — Retenciones e ingresos a cuenta sobre rendimientos
 * del trabajo a no residentes.
 *
 * Declaración trimestral de retenciones practicadas sobre rendimientos
 * del trabajo percibidos por personas físicas no residentes en España.
 *
 * Tipos generales: 19 % (residentes UE/EEE y dividendos/intereses) y 24 % (resto).
 * Convenios de doble imposición: 0 %, 5 %, 8 %, 10 %, 11 % o 15 % según el Estado.
 *
 * Fuentes: Art. 81-83 Reglamento IRNR, modelo oficial AEAT.
 */

export interface RetencionNoResidente216 {
  /** NIF del beneficiario (o NIE/passport si no tiene NIF) */
  nifBeneficiario: string
  /** Nombre completo del beneficiario */
  nombreBeneficiario: string
  /** País de residencia del beneficiario (código ISO) */
  paisResidencia: string
  /** Rentas percibidas en el trimestre (céntimos) */
  rentasCents: number
  /** Tipo de retención aplicado (%) */
  tipoRetencionPct: number
  /** Retención practicada (céntimos) */
  retencionPracticadaCents: number
}

export interface DatosModelo216 {
  trimestre: 1 | 2 | 3 | 4
  ejercicio: number
  retenciones: RetencionNoResidente216[]
}

export interface ResultadoModelo216 {
  trimestre: number
  ejercicio: number
  totalRentas: number
  totalRetenciones: number
  numBeneficiarios: number
  paisesRepresentados: number
  rentaMedia: number
  retencionMedia: number
  observaciones: string[]
}

export function calcularModelo216(datos: DatosModelo216): ResultadoModelo216 {
  const observaciones: string[] = []

  let totalRentas = 0
  let totalRetenciones = 0
  const beneficiarios = new Set<string>()
  const paises = new Set<string>()

  for (const r of datos.retenciones) {
    const ret = r.retencionPracticadaCents || Math.round(r.rentasCents * (r.tipoRetencionPct / 100))
    totalRentas += r.rentasCents
    totalRetenciones += ret
    beneficiarios.add(r.nifBeneficiario || r.nombreBeneficiario)
    paises.add(r.paisResidencia)
  }

  const numBeneficiarios = beneficiarios.size
  const paisesRepresentados = paises.size
  const rentaMedia = numBeneficiarios > 0 ? Math.round(totalRentas / numBeneficiarios) : 0
  const retencionMedia = numBeneficiarios > 0 ? Math.round(totalRetenciones / numBeneficiarios) : 0

  if (numBeneficiarios === 0) {
    observaciones.push('No se han declarado perceptores en este trimestre')
  }

  if (paisesRepresentados > 10) {
    observaciones.push(
      `Se declaran perceptores de ${paisesRepresentados} países diferentes — verificar convenios`,
    )
  }

  const tiposAplicados = new Set(datos.retenciones.map((r) => r.tipoRetencionPct))
  if (tiposAplicados.size > 1) {
    observaciones.push(
      `Se han aplicado ${tiposAplicados.size} tipos de retención diferentes — verificar convenios de doble imposición`,
    )
  }

  return {
    trimestre: datos.trimestre,
    ejercicio: datos.ejercicio,
    totalRentas,
    totalRetenciones,
    numBeneficiarios,
    paisesRepresentados,
    rentaMedia,
    retencionMedia,
    observaciones,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export const TIPOS_RETENCION_216 = [
  { valor: 24, label: 'General no UE/EEE (24%) — sin convenio' },
  { valor: 19, label: 'General UE/EEE o dividendos e intereses (19%)' },
  { valor: 15, label: 'Convenio de doble imposición (15%)' },
  { valor: 11, label: 'Convenio reducido (11%)' },
  { valor: 10, label: 'Convenio reducido (10%)' },
  { valor: 8, label: 'Convenio reducido (8%)' },
  { valor: 5, label: 'Convenio reducido (5%)' },
  { valor: 0, label: 'Exento por convenio (0%)' },
] as const
