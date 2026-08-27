export interface OperacionVinculada233 {
  nifContraparte: string
  importe: number
}

export interface DatosModelo233 {
  operaciones: OperacionVinculada233[]
  umbral?: number
}

export interface ResultadoModelo233 {
  totalOperaciones: number
  umbral: number
  superaUmbral: boolean
  operaciones: OperacionVinculada233[]
}

export const UMBRAL_OPERACIONES_VINCULADAS = 250_000

export function calcularModelo233(datos: DatosModelo233): ResultadoModelo233 {
  const umbral = datos.umbral ?? UMBRAL_OPERACIONES_VINCULADAS
  const totalOperaciones = datos.operaciones.reduce((sum, op) => sum + op.importe, 0)
  const superaUmbral = totalOperaciones > umbral

  return {
    totalOperaciones,
    umbral,
    superaUmbral,
    operaciones: datos.operaciones,
  }
}