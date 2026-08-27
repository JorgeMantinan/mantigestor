export interface DatosModelo179 {
  diasAlquiler: number
  rendimiento: number
  viviendas: number
}

export interface ResultadoModelo179 {
  viviendas: number
  diasTotales: number
  rendimientoTotal: number
  promedioDias: number
}

export function calcularModelo179(datos: DatosModelo179): ResultadoModelo179 {
  const viviendas = Math.max(0, datos.viviendas)
  const diasTotales = datos.diasAlquiler * viviendas
  const promedioDias = viviendas > 0 ? diasTotales / viviendas : 0

  return {
    viviendas,
    diasTotales,
    rendimientoTotal: datos.rendimiento,
    promedioDias,
  }
}