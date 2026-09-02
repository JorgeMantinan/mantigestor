interface Factura {
  total: number
  tipo: string
  fechaEmision: string
}

interface PrediccionMes {
  mes: string
  gastoPrevisto: number
  confianza: number
}

export interface ResultadoPrediccion {
  predicciones: PrediccionMes[]
  tendencia: 'subida' | 'bajada' | 'estable'
}

export function predecirGastos(
  facturas: Factura[],
  mesesHistorial = 6
): ResultadoPrediccion {
  const ahora = new Date()
  const mesActual = ahora.getMonth()
  const anyoActual = ahora.getFullYear()

  const gastosPorMes: number[] = []

  for (let i = mesesHistorial - 1; i >= 0; i--) {
    const mes = mesActual - i
    const anyo = mes < 0 ? anyoActual - 1 : anyoActual
    const mesAbs = mes < 0 ? mes + 12 : mes

    const total = facturas
      .filter(f => {
        const d = new Date(f.fechaEmision)
        return d.getMonth() === mesAbs && d.getFullYear() === anyo && f.tipo === 'gasto'
      })
      .reduce((s, f) => s + f.total, 0)

    gastosPorMes.push(total)
  }

  const media = gastosPorMes.reduce((s, v) => s + v, 0) / gastosPorMes.length

  const varianza = gastosPorMes.reduce((s, v) => s + Math.pow(v - media, 2), 0) / gastosPorMes.length
  const desviacion = Math.sqrt(varianza)
  const coefVariacion = media > 0 ? desviacion / media : 0

  const confianza = Math.max(0, Math.min(1, 1 - coefVariacion))

  const nombresMeses = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]

  const predicciones: PrediccionMes[] = []

  for (let i = 0; i <= 2; i++) {
    const mesOffset = i
    const mesIdx = (mesActual + 1 + mesOffset) % 12
    const anyo = mesActual + 1 + mesOffset >= 12 ? anyoActual + 1 : anyoActual

    let gastoPrevisto: number
    if (i === 0) {
      gastoPrevisto = Math.round(media)
    } else {
      const pesoUltimo = 0.6
      gastoPrevisto = Math.round(
        (gastosPorMes[gastosPorMes.length - 1] ?? media) * pesoUltimo + media * (1 - pesoUltimo)
      )
    }

    predicciones.push({
      mes: `${nombresMeses[mesIdx] ?? ''} ${anyo}`,
      gastoPrevisto,
      confianza,
    })
  }

  const ultimos3 = gastosPorMes.slice(-3)
  const anteriores3 = gastosPorMes.slice(-6, -3)
  const mediaUltimos3 = ultimos3.reduce((s, v) => s + v, 0) / ultimos3.length
  const mediaAnteriores3 = anteriores3.length > 0
    ? anteriores3.reduce((s, v) => s + v, 0) / anteriores3.length
    : mediaUltimos3

  const diff = mediaUltimos3 - mediaAnteriores3
  const umbral = mediaAnteriores3 * 0.05

  let tendencia: 'subida' | 'bajada' | 'estable'
  if (diff > umbral) {
    tendencia = 'subida'
  } else if (diff < -umbral) {
    tendencia = 'bajada'
  } else {
    tendencia = 'estable'
  }

  return { predicciones, tendencia }
}
