import { createClient } from '@/lib/supabase/client'
import { formatoMoneda } from '@/lib/divisas'

export interface DatosInformeCliente {
  perfilId: string
  nombre: string
  email: string
  nif: string | null
  periodo: string
  fechaGeneracion: string
  resumen: {
    ingresosTotales: number
    gastosTotales: number
    beneficioNeto: number
    ivaDevengado: number
    ivaSoportado: number
    ivaLiquidado: number
    retencionesPagadas: number
    pagosFraccionados: number
  }
  modelosPendientes: Array<{
    modelo: string
    nombre: string
    plazoMaximo: string
    estado: string
  }>
  calendarioFiscal: Array<{
    fecha: string
    descripcion: string
    diasRestantes: number
  }>
  recomendaciones: string[]
  desgloseGastos: Array<{
    categoria: string
    importe: number
    porcentaje: number
  }>
  ingresosMensuales: Array<{
    mes: string
    importe: number
  }>
}

export async function generarDatosInforme(
  perfilId: string,
  anyo: number,
  trimestre?: number
): Promise<DatosInformeCliente> {
  const supabase = createClient()

  // Perfil
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, email, nif')
    .eq('id', perfilId)
    .single()

  const nombre = perfil?.nombre ?? 'Cliente'
  const email = perfil?.email ?? ''
  const nif = perfil?.nif ?? null

  // Fechas del periodo
  let fechaInicio: Date
  let fechaFin: Date
  let periodoLabel: string

  if (trimestre) {
    fechaInicio = new Date(anyo, (trimestre - 1) * 3, 1)
    fechaFin = new Date(anyo, trimestre * 3, 0)
    periodoLabel = `${trimestre}T ${anyo}`
  } else {
    fechaInicio = new Date(anyo, 0, 1)
    fechaFin = new Date(anyo, 11, 31)
    periodoLabel = `Ejercicio ${anyo}`
  }

  // Facturas del periodo
  const { data: facturas } = await supabase
    .from('facturas')
    .select('tipo, baseImponible, iva, total, estado, categoriaGasto, fechaEmision')
    .eq('perfilId', perfilId)
    .gte('fechaEmision', fechaInicio.toISOString())
    .lte('fechaEmision', fechaFin.toISOString())

  const ingresos = (facturas ?? []).filter(f => f.tipo === 'ingreso')
  const gastos = (facturas ?? []).filter(f => f.tipo === 'gasto')

  const ingresosTotales = ingresos.reduce((s, f) => s + f.total, 0)
  const gastosTotales = gastos.reduce((s, f) => s + f.total, 0)
  const ivaDevengado = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
  const ivaSoportado = gastos.reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
  const ivaLiquidado = ivaDevengado - ivaSoportado

  // Nóminas del periodo
  const { data: nominas } = await supabase
    .from('nominas')
    .select('irpf, salarioBruto, neto')
    .eq('perfilId', perfilId)
    .gte('createdAt', fechaInicio.toISOString())
    .lte('createdAt', fechaFin.toISOString())

  const retencionesPagadas = (nominas ?? []).reduce((s, n) => s + Math.round(n.salarioBruto * n.irpf / 100), 0)
  const pagosFraccionados = (nominas ?? []).reduce((s, n) => s + n.neto, 0)

  // Modelos pendientes
  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const modelosPendientes: DatosInformeCliente['modelosPendientes'] = []

  if ([1, 4, 7, 10].includes(mesActual) && hoy.getDate() <= 20) {
    modelosPendientes.push(
      { modelo: '303', nombre: 'IVA Trimestral', plazoMaximo: '20 del mes siguiente', estado: 'Pendiente' },
      { modelo: '130', nombre: 'Pago Fraccionado', plazoMaximo: '20 del mes siguiente', estado: 'Pendiente' },
      { modelo: '111', nombre: 'Retenciones', plazoMaximo: '20 del mes siguiente', estado: 'Pendiente' }
    )
  }

  // Calendario fiscal
  const calendarioFiscal: DatosInformeCliente['calendarioFiscal'] = []
  const proximosPlazos = [
    { fecha: new Date(anyo, 0, 31), descripcion: 'Modelo 190 - Retenciones anuales' },
    { fecha: new Date(anyo, 3, 20), descripcion: 'Modelo 130 - 1er Trimestre' },
    { fecha: new Date(anyo, 6, 20), descripcion: 'Modelo 130 - 2º Trimestre' },
    { fecha: new Date(anyo, 9, 20), descripcion: 'Modelo 130 - 3er Trimestre' },
    { fecha: new Date(anyo + 1, 0, 30), descripcion: 'Modelo 100 - Declaración de la Renta' },
  ]

  for (const plazo of proximosPlazos) {
    if (plazo.fecha > hoy) {
      const diasRestantes = Math.ceil((plazo.fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      calendarioFiscal.push({
        fecha: plazo.fecha.toLocaleDateString('es-ES'),
        descripcion: plazo.descripcion,
        diasRestantes,
      })
    }
  }

  // Desglose de gastos por categoría
  const categoriasMap = new Map<string, number>()
  for (const g of gastos) {
    const cat = g.categoriaGasto ?? 'Otros'
    categoriasMap.set(cat, (categoriasMap.get(cat) ?? 0) + g.total)
  }
  const desgloseGastos = Array.from(categoriasMap.entries())
    .map(([categoria, importe]) => ({
      categoria,
      importe,
      porcentaje: gastosTotales > 0 ? Math.round((importe / gastosTotales) * 100) : 0,
    }))
    .sort((a, b) => b.importe - a.importe)

  // Ingresos mensuales
  const ingresosMensMap = new Map<string, number>()
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  for (const ing of ingresos) {
    const mes = meses[new Date(ing.fechaEmision).getMonth()] ?? '??'
    ingresosMensMap.set(mes, (ingresosMensMap.get(mes) ?? 0) + ing.total)
  }
  const ingresosMensuales = meses
    .filter(m => ingresosMensMap.has(m))
    .map(mes => ({ mes, importe: ingresosMensMap.get(mes) ?? 0 }))

  // Recomendaciones
  const recomendaciones: string[] = []
  if (ivaLiquidado > 0) {
    recomendaciones.push(`Considera diferir el IVA liquidado de ${formatoMoneda(ivaLiquidado / 100, 'EUR')} al siguiente periodo si es posible.`)
  }
  if (gastosTotales < ingresosTotales * 0.3) {
    recomendaciones.push('Tus gastos son bajos respecto a tus ingresos. Revisa si hay gastos deducibles no registrados.')
  }
  if (retencionesPagadas > ingresosTotales * 0.2) {
    recomendaciones.push('Las retenciones son altas. Podrías beneficiarte de reducir el porcentaje de retención.')
  }
  if (desgloseGastos.length > 0 && desgloseGastos[0] && desgloseGastos[0].porcentaje > 50) {
    recomendaciones.push(`El ${desgloseGastos[0].porcentaje}% de tus gastos está en "${desgloseGastos[0].categoria}". Diversificar puede ser beneficioso fiscalmente.`)
  }
  if (modelosPendientes.length > 0) {
    recomendaciones.push(`Tienes ${modelosPendientes.length} modelo(s) fiscal(es) pendiente(s). Presenta antes de la fecha límite para evitar sanciones.`)
  }

  return {
    perfilId,
    nombre,
    email,
    nif,
    periodo: periodoLabel,
    fechaGeneracion: new Date().toLocaleDateString('es-ES'),
    resumen: {
      ingresosTotales,
      gastosTotales,
      beneficioNeto: ingresosTotales - gastosTotales,
      ivaDevengado,
      ivaSoportado,
      ivaLiquidado,
      retencionesPagadas,
      pagosFraccionados,
    },
    modelosPendientes,
    calendarioFiscal,
    recomendaciones,
    desgloseGastos,
    ingresosMensuales,
  }
}

export function generarCSVInforme(datos: DatosInformeCliente): string {
  const lineas: string[] = []
  lineas.push('Informe de Cliente - MantiGestor')
  lineas.push(`Cliente: ${datos.nombre}`)
  lineas.push(`NIF: ${datos.nif ?? 'N/A'}`)
  lineas.push(`Periodo: ${datos.periodo}`)
  lineas.push(`Fecha: ${datos.fechaGeneracion}`)
  lineas.push('')
  lineas.push('RESUMEN FINANCIERO')
  lineas.push(`Ingresos totales,${datos.resumen.ingresosTotales / 100}`)
  lineas.push(`Gastos totales,${datos.resumen.gastosTotales / 100}`)
  lineas.push(`Beneficio neto,${datos.resumen.beneficioNeto / 100}`)
  lineas.push(`IVA devengado,${datos.resumen.ivaDevengado / 100}`)
  lineas.push(`IVA soportado,${datos.resumen.ivaSoportado / 100}`)
  lineas.push(`IVA liquidado,${datos.resumen.ivaLiquidado / 100}`)
  lineas.push('')
  lineas.push('MODELOS PENDIENTES')
  for (const m of datos.modelosPendientes) {
    lineas.push(`Modelo ${m.modelo},${m.nombre},${m.estado},${m.plazoMaximo}`)
  }
  lineas.push('')
  lineas.push('DESGLOSE DE GASTOS')
  for (const g of datos.desgloseGastos) {
    lineas.push(`${g.categoria},${g.importe / 100},${g.porcentaje}%`)
  }
  lineas.push('')
  lineas.push('RECOMENDACIONES')
  for (const r of datos.recomendaciones) {
    lineas.push(r)
  }
  return lineas.join('\n')
}
