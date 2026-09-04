interface Factura {
  total: number
  tipo: string
  fechaEmision: string
}

interface PrediccionMes {
  mes: string
  ingresoPrevisto: number
  gastoPrevisto: number
  beneficioPrevisto: number
  confianza: number
}

export interface ResultadoPrediccion {
  predicciones: PrediccionMes[]
  tendencia: 'creciente' | 'estable' | 'decreciente'
  variacionPorcentual: number
  historial: number[]
}

const NOMBRES_MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function agruparPorMes(facturas: Factura[], tipo: string, mesesHistorial: number): number[] {
  const ahora = new Date()
  const mesActual = ahora.getMonth()
  const anyoActual = ahora.getFullYear()
  const meses: number[] = []

  for (let i = mesesHistorial - 1; i >= 0; i--) {
    const mes = mesActual - i
    const anyo = mes < 0 ? anyoActual - 1 : anyoActual
    const mesAbs = mes < 0 ? mes + 12 : mes

    const total = facturas
      .filter(f => {
        const d = new Date(f.fechaEmision)
        return d.getMonth() === mesAbs && d.getFullYear() === anyo && f.tipo === tipo
      })
      .reduce((s, f) => s + f.total, 0)

    meses.push(total)
  }

  return meses
}

function mediaPonderada(valores: number[]): number {
  if (valores.length === 0) return 0
  if (valores.length === 1) return valores[0] ?? 0

  let sumaPonderada = 0
  let sumaPesos = 0

  for (let i = 0; i < valores.length; i++) {
    const peso = (i + 1) / valores.length
    sumaPonderada += (valores[i] ?? 0) * peso
    sumaPesos += peso
  }

  return sumaPesos > 0 ? sumaPonderada / sumaPesos : 0
}

function calcularVarianza(valores: number[]): number {
  if (valores.length === 0) return 0
  const media = valores.reduce((s, v) => s + v, 0) / valores.length
  const sumaCuadrados = valores.reduce((s, v) => s + Math.pow(v - media, 2), 0)
  return sumaCuadrados / valores.length
}

function calcularConfianza(valores: number[]): number {
  if (valores.length < 2) return 0.5
  const media = valores.reduce((s, v) => s + v, 0) / valores.length
  if (media === 0) return 0.5
  const desviacion = Math.sqrt(calcularVarianza(valores))
  const coefVariacion = desviacion / Math.abs(media)
  return Math.max(0.1, Math.min(1, 1 - coefVariacion))
}

function calcularTendencia(valores: number[]): { tendencia: 'creciente' | 'estable' | 'decreciente'; variacion: number } {
  if (valores.length < 2) return { tendencia: 'estable', variacion: 0 }

  const tercio = Math.floor(valores.length / 3)
  const grupoInicial = valores.slice(0, tercio || 1)
  const grupoFinal = valores.slice(-(tercio || 1))

  const mediaInicial = grupoInicial.reduce((s, v) => s + v, 0) / grupoInicial.length
  const mediaFinal = grupoFinal.reduce((s, v) => s + v, 0) / grupoFinal.length

  const variacion = mediaInicial > 0
    ? ((mediaFinal - mediaInicial) / mediaInicial) * 100
    : mediaFinal > 0 ? 100 : 0

  const umbral = 5

  if (variacion > umbral) return { tendencia: 'creciente', variacion }
  if (variacion < -umbral) return { tendencia: 'decreciente', variacion }
  return { tendencia: 'estable', variacion }
}

export function predecirIngresos(facturas: Factura[], mesesHistorial = 6): ResultadoPrediccion {
  const historial = agruparPorMes(facturas, 'ingreso', mesesHistorial)
  const confianza = calcularConfianza(historial)
  const { tendencia, variacion } = calcularTendencia(historial)

  const ahora = new Date()
  const mesActual = ahora.getMonth()
  const anyoActual = ahora.getFullYear()

  const predicciones: PrediccionMes[] = []

  for (let i = 0; i < 3; i++) {
    const mesIdx = (mesActual + 1 + i) % 12
    const anyo = mesActual + 1 + i >= 12 ? anyoActual + 1 : anyoActual

    const ultimos = historial.slice(-(mesesHistorial - i))
    let ingresoPrevisto: number

    if (i === 0) {
      ingresoPrevisto = Math.round(mediaPonderada(historial))
    } else {
      const recientes = historial.slice(-(Math.min(mesesHistorial, 3) - Math.min(i, 2)))
      const peso = 0.6
      const base = mediaPonderada(recientes.length > 0 ? recientes : historial)
      const ultimo = historial[historial.length - 1] ?? base
      ingresoPrevisto = Math.round(ultimo * peso + base * (1 - peso))
    }

    predicciones.push({
      mes: `${NOMBRES_MESES[mesIdx] ?? ''} ${anyo}`,
      ingresoPrevisto,
      gastoPrevisto: 0,
      beneficioPrevisto: 0,
      confianza,
    })
  }

  return { predicciones, tendencia, variacionPorcentual: variacion, historial }
}

export function predecirGastos(facturas: Factura[], mesesHistorial = 6): ResultadoPrediccion {
  const historial = agruparPorMes(facturas, 'gasto', mesesHistorial)
  const confianza = calcularConfianza(historial)
  const { tendencia, variacion } = calcularTendencia(historial)

  const ahora = new Date()
  const mesActual = ahora.getMonth()
  const anyoActual = ahora.getFullYear()

  const predicciones: PrediccionMes[] = []

  for (let i = 0; i < 3; i++) {
    const mesIdx = (mesActual + 1 + i) % 12
    const anyo = mesActual + 1 + i >= 12 ? anyoActual + 1 : anyoActual

    let gastoPrevisto: number

    if (i === 0) {
      gastoPrevisto = Math.round(mediaPonderada(historial))
    } else {
      const recientes = historial.slice(-(Math.min(mesesHistorial, 3) - Math.min(i, 2)))
      const peso = 0.6
      const base = mediaPonderada(recientes.length > 0 ? recientes : historial)
      const ultimo = historial[historial.length - 1] ?? base
      gastoPrevisto = Math.round(ultimo * peso + base * (1 - peso))
    }

    predicciones.push({
      mes: `${NOMBRES_MESES[mesIdx] ?? ''} ${anyo}`,
      ingresoPrevisto: 0,
      gastoPrevisto,
      beneficioPrevisto: 0,
      confianza,
    })
  }

  return { predicciones, tendencia, variacionPorcentual: variacion, historial }
}

export function predecirBeneficio(
  prediccionIngresos: ResultadoPrediccion,
  prediccionGastos: ResultadoPrediccion
): PrediccionMes[] {
  return prediccionIngresos.predicciones.map((p, i) => {
    const g = prediccionGastos.predicciones[i]
    const ingreso = p.ingresoPrevisto
    const gasto = g?.gastoPrevisto ?? 0
    return {
      mes: p.mes,
      ingresoPrevisto: ingreso,
      gastoPrevisto: gasto,
      beneficioPrevisto: ingreso - gasto,
      confianza: Math.min(p.confianza, g?.confianza ?? 1),
    }
  })
}
