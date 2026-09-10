import type { Resultado100Automatico } from './auto-100'

export interface RentaWebExport {
  ejercicio: number
  nif: string
  nombre: string
  situacionCivil: string
  fechaNacimiento?: string
  numeroHijos: number
  hijos?: { fechaNacimiento: string; discapacidad: number }[]
  casillas: {
    '0480': number
    '0485': number
    '0497': number
    '0498': number
    '0500': number
    '0509': number
    '0510': number
    '0520': number
    '0527': number
    '0546': number
    '0548': number
    '0695': number
    '0714': number
    '0716': number
  }
  detalle: {
    rendimientosTrabajo: number
    rendimientosActividades: number
    rendimientosAlquiler: number
    reduccionTrabajo: number
    reduccionBase: number
    planPensiones: number
    segurosDependencia: number
    donaciones: number
  }
}

function situacionCivilAeat(sc: string): string {
  const map: Record<string, string> = {
    soltero: '1',
    casado: '2',
    divorciado: '3',
    viudo: '4',
  }
  return map[sc] ?? '1'
}

export function generarRentaWebExport(r: Resultado100Automatico): RentaWebExport {
  const baseLiquidable = r.baseLiquidableGeneral
  const totalCuota = r.resultado.totalCuota
  const cuotaLiquida = r.resultado.cuotaLiquida
  const deducciones = r.resultado.deducciones
  const totalPagos = r.retencionesIRPF + r.pagosFraccionados

  return {
    ejercicio: r.anyo,
    nif: r.perfil?.nif ?? '',
    nombre: r.perfil?.nombre ?? '',
    situacionCivil: situacionCivilAeat(r.situacionCivil),
    fechaNacimiento: r.fechaNacimiento ?? undefined,
    numeroHijos: r.numeroHijos,
    casillas: {
      '0480': r.baseImponibleGeneral,
      '0485': r.reduccionTrabajo,
      '0497': baseLiquidable,
      '0498': r.resultado.baseImponibleAhorro,
      '0500': r.resultado.cuotaIntegra,
      '0509': totalCuota,
      '0510': cuotaLiquida,
      '0520': r.minimoPersonalFamiliar,
      '0527': deducciones,
      '0546': r.pagosFraccionados,
      '0548': r.retencionesIRPF,
      '0695': cuotaLiquida - totalPagos,
      '0714': r.resultado.aDevolver,
      '0716': r.resultado.aPagar,
    },
    detalle: {
      rendimientosTrabajo: r.rendimientosTrabajo,
      rendimientosActividades: r.rendimientosActividades,
      rendimientosAlquiler: r.rendimientosAlquiler,
      reduccionTrabajo: r.reduccionTrabajo,
      reduccionBase: r.planPensiones + r.segurosDependencia,
      planPensiones: r.planPensiones,
      segurosDependencia: r.segurosDependencia,
      donaciones: r.donaciones,
    },
  }
}

export function descargarRentaWeb(data: RentaWebExport) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `renta-web-${data.ejercicio}-${data.nif}.json`
  a.click()
  URL.revokeObjectURL(url)
}
