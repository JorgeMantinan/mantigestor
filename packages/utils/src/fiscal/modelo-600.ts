export interface DatosModelo600 {
  valorBien: number
  tipoGravamenPct?: number
  baseLiquidable?: number
}

export interface ResultadoModelo600 {
  valorBien: number
  tipoGravamen: number
  baseLiquidable: number
  cuota: number
}

export const TIPO_GRAVAMEN_ITP_ORIENTATIVO = 6

export function calcularModelo600(datos: DatosModelo600): ResultadoModelo600 {
  const tipoGravamen = datos.tipoGravamenPct ?? TIPO_GRAVAMEN_ITP_ORIENTATIVO
  const baseLiquidable = datos.baseLiquidable ?? datos.valorBien
  const cuota = baseLiquidable * (tipoGravamen / 100)

  return {
    valorBien: datos.valorBien,
    tipoGravamen,
    baseLiquidable,
    cuota,
  }
}