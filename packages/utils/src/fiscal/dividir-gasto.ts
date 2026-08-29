export interface Participante {
  nombre: string
  porcentaje: number
}

export interface ResultadoSplit {
  nombre: string
  porcentaje: number
  importe: number
}

export function dividirGasto(total: number, participantes: Participante[]): ResultadoSplit[] {
  const totalPorcentaje = participantes.reduce((s, p) => s + p.porcentaje, 0)
  if (totalPorcentaje === 0) return participantes.map(p => ({ ...p, importe: 0 }))

  return participantes.map(p => ({
    nombre: p.nombre,
    porcentaje: p.porcentaje,
    importe: Math.round((total * p.porcentaje / totalPorcentaje) * 100) / 100,
  }))
}

export function dividirIgual(total: number, nombres: string[]): ResultadoSplit[] {
  const participantes = nombres.map(n => ({ nombre: n, porcentaje: 1 }))
  return dividirGasto(total, participantes)
}
