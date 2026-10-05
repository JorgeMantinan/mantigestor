export interface FactorScore {
  nombre: string
  puntos: number
  maxPuntos: number
  estado: 'bien' | 'mejorable' | 'malo'
  descripcion: string
  consejo: string
}

export interface ScoreFiscal {
  puntuacion: number
  factores: FactorScore[]
  resumen: string
}

interface FacturaInput {
  tipo: string
  numero: string
  nifContraparte: string | null
  fechaEmision: string
  fechaVencimiento: string | null
  baseImponible: number
  iva: number
  total: number
  estado: string
  emisorReceptor: string
}

interface PerfilInput {
  nif?: string | null
}

function calcEstado(pct: number): 'bien' | 'mejorable' | 'malo' {
  if (pct >= 0.8) return 'bien'
  if (pct >= 0.5) return 'mejorable'
  return 'malo'
}

function facturasConNif(facturas: FacturaInput[]): FactorScore {
  if (facturas.length === 0) {
    return { nombre: 'NIF correcto', puntos: 15, maxPuntos: 15, estado: 'bien', descripcion: 'No hay facturas', consejo: 'Añade facturas con NIF de contraparte' }
  }
  const conNif = facturas.filter(f => f.nifContraparte && f.nifContraparte.trim().length >= 9).length
  const pct = conNif / facturas.length
  const puntos = Math.round(pct * 15)
  return {
    nombre: 'NIF correcto',
    puntos,
    maxPuntos: 15,
    estado: calcEstado(pct),
    descripcion: `${conNif} de ${facturas.length} facturas con NIF válido`,
    consejo: 'Añade el NIF de la contraparte en todas las facturas (requerido para modelos 303/347)',
  }
}

function facturasRecientes(facturas: FacturaInput[]): FactorScore {
  if (facturas.length === 0) {
    return { nombre: 'Facturas actualizadas', puntos: 15, maxPuntos: 15, estado: 'bien', descripcion: 'No hay facturas', consejo: 'Registra tus facturas regularmente' }
  }
  const hoy = new Date()
  const hace30d = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recientes = facturas.filter(f => new Date(f.fechaEmision) >= hace30d).length
  const pct = recientes / facturas.length
  const puntos = Math.round(pct * 15)
  return {
    nombre: 'Facturas actualizadas',
    puntos,
    maxPuntos: 15,
    estado: calcEstado(pct),
    descripcion: `${recientes} de ${facturas.length} facturas en los últimos 30 días`,
    consejo: 'Registra facturas semanalmente para mantener el registro al día',
  }
}

function ivaDesglosado(facturas: FacturaInput[]): FactorScore {
  const facturasIva = facturas.filter(f => f.total > 0)
  if (facturasIva.length === 0) {
    return { nombre: 'IVA desglosado', puntos: 15, maxPuntos: 15, estado: 'bien', descripcion: 'No hay facturas con importe', consejo: '' }
  }
  const correctas = facturasIva.filter(f => {
    const ivaCalculado = Math.round(f.baseImponible * (f.iva / 100))
    return Math.abs(f.total - f.baseImponible - ivaCalculado) <= 1
  }).length
  const pct = correctas / facturasIva.length
  const puntos = Math.round(pct * 15)
  return {
    nombre: 'IVA desglosado',
    puntos,
    maxPuntos: 15,
    estado: calcEstado(pct),
    descripcion: `${correctas} de ${facturasIva.length} facturas con IVA cuadrado`,
    consejo: 'Verifica que total = base imponible + IVA en cada factura',
  }
}

function facturasSinNumero(facturas: FacturaInput[]): FactorScore {
  if (facturas.length === 0) {
    return { nombre: 'Numeración correcta', puntos: 10, maxPuntos: 10, estado: 'bien', descripcion: 'No hay facturas', consejo: '' }
  }
  const sinNumero = facturas.filter(f => !f.numero || f.numero.trim() === '').length
  const conNumero = facturas.length - sinNumero
  const pct = conNumero / facturas.length
  const puntos = Math.round(pct * 10)
  return {
    nombre: 'Numeración correcta',
    puntos,
    maxPuntos: 10,
    estado: sinNumero === 0 ? 'bien' : sinNumero <= 2 ? 'mejorable' : 'malo',
    descripcion: sinNumero === 0
      ? `Todas las ${facturas.length} facturas tienen número`
      : `${sinNumero} facturas sin número asignado`,
    consejo: 'Asigna un número secuencial a cada factura (obligatorio fiscalmente)',
  }
}

function modelosFiscales(facturas: FacturaInput[]): FactorScore {
  const hayFacturas = facturas.length > 0
  if (!hayFacturas) {
    return { nombre: 'Modelos fiscales', puntos: 10, maxPuntos: 10, estado: 'mejorable', descripcion: 'Sin datos para evaluar', consejo: 'Añade facturas para poder evaluar modelos' }
  }
  const porMes: Record<number, number> = {}
  facturas.forEach(f => {
    const mes = new Date(f.fechaEmision).getMonth() + 1
    porMes[mes] = (porMes[mes] ?? 0) + f.total
  })
  const mesesConFacturas = Object.keys(porMes).length
  const pct = Math.min(mesesConFacturas / 4, 1)
  const puntos = Math.round(pct * 10)
  return {
    nombre: 'Modelos fiscales',
    puntos,
    maxPuntos: 10,
    estado: calcEstado(pct),
    descripcion: `${mesesConFacturas} meses con actividad fiscal`,
    consejo: 'Presenta el modelo 303 trimestral y 111 si tienes empleados',
  }
}

function pagosATiempo(facturas: FacturaInput[]): FactorScore {
  const conVencimiento = facturas.filter(f => f.fechaVencimiento)
  if (conVencimiento.length === 0) {
    return { nombre: 'Pagos a tiempo', puntos: 10, maxPuntos: 10, estado: 'bien', descripcion: 'Sin vencimientos registrados', consejo: 'Registra fechas de vencimiento para mejor seguimiento' }
  }
  const pagadas = conVencimiento.filter(f => f.estado === 'pagada')
  const vencidas = conVencimiento.filter(f => f.estado === 'vencida')
  const pendientes = conVencimiento.length - pagadas.length - vencidas.length
  const pct = pagadas.length / conVencimiento.length
  const puntos = Math.round(pct * 10)
  return {
    nombre: 'Pagos a tiempo',
    puntos,
    maxPuntos: 10,
    estado: vencidas.length === 0 ? 'bien' : vencidas.length <= 2 ? 'mejorable' : 'malo',
    descripcion: `${pagadas.length} pagadas, ${pendientes} pendientes, ${vencidas.length} vencidas`,
    consejo: 'Registra cobros/pagos puntualmente y actualiza el estado de cada factura',
  }
}

function documentacionCompleta(facturas: FacturaInput[]): FactorScore {
  if (facturas.length === 0) {
    return { nombre: 'Documentación', puntos: 10, maxPuntos: 10, estado: 'bien', descripcion: 'No hay facturas', consejo: '' }
  }
  const completas = facturas.filter(f => f.nifContraparte && f.fechaVencimiento).length
  const pct = completas / facturas.length
  const puntos = Math.round(pct * 10)
  return {
    nombre: 'Documentación',
    puntos,
    maxPuntos: 10,
    estado: calcEstado(pct),
    descripcion: `${completas} de ${facturas.length} facturas con docs completas (NIF + vencimiento)`,
    consejo: 'Añade NIF, fecha de vencimiento y categoría de gasto a todas las facturas',
  }
}

function formatoCorrecto(facturas: FacturaInput[]): FactorScore {
  if (facturas.length === 0) {
    return { nombre: 'Formato', puntos: 5, maxPuntos: 5, estado: 'bien', descripcion: 'No hay facturas', consejo: '' }
  }
  let errores = 0
  facturas.forEach(f => {
    if (f.total <= 0) errores++
    if (f.baseImponible < 0) errores++
    if (f.iva < 0 || f.iva > 100) errores++
    if (!f.emisorReceptor || f.emisorReceptor.trim() === '') errores++
  })
  const pct = Math.max(0, 1 - errores / facturas.length)
  const puntos = Math.round(pct * 5)
  return {
    nombre: 'Formato',
    puntos,
    maxPuntos: 5,
    estado: errores === 0 ? 'bien' : errores <= 2 ? 'mejorable' : 'malo',
    descripcion: errores === 0 ? 'Todos los campos con formato correcto' : `${errores} errores de formato detectados`,
    consejo: 'Revisa que todos los importes sean positivos y los campos obligatorios estén rellenos',
  }
}

export function calcularScoreFiscal(facturas: FacturaInput[], _perfil: PerfilInput): ScoreFiscal {
  const factores: FactorScore[] = [
    facturasConNif(facturas),
    facturasRecientes(facturas),
    ivaDesglosado(facturas),
    facturasSinNumero(facturas),
    modelosFiscales(facturas),
    pagosATiempo(facturas),
    documentacionCompleta(facturas),
    formatoCorrecto(facturas),
  ]

  const totalPuntos = factores.reduce((s, f) => s + f.puntos, 0)
  const maxPuntos = factores.reduce((s, f) => s + f.maxPuntos, 0)
  const puntuacion = maxPuntos > 0 ? Math.round((totalPuntos / maxPuntos) * 100) : 0

  let resumen: string
  if (puntuacion >= 80) resumen = 'Tu cumplimiento fiscal es excelente. Mantén el ritmo.'
  else if (puntuacion >= 60) resumen = 'Buen nivel, pero hay áreas que mejorar para evitar sanciones.'
  else if (puntuacion >= 40) resumen = 'Atención: varios factores fiscalmente mejorables.'
  else resumen = 'Riesgo alto. Revisa los factores pendientes cuanto antes.'

  return { puntuacion, factores, resumen }
}
