export interface DatosModelo170 {
  baseImponible: number
  tipoRetencionPct?: number
}

export interface ResultadoModelo170 {
  baseImponible: number
  tipoRetencion: number
  cuotaRetenida: number
}

export const TIPOS_RETENCION_MODELO_170 = {
  personaFisica: 19,
  empresarioProfesional: 24,
} as const

export function calcularModelo170(datos: DatosModelo170): ResultadoModelo170 {
  const tipoRetencion = datos.tipoRetencionPct ?? TIPOS_RETENCION_MODELO_170.personaFisica
  const cuotaRetenida = datos.baseImponible * (tipoRetencion / 100)

  return {
    baseImponible: datos.baseImponible,
    tipoRetencion,
    cuotaRetenida,
  }
}