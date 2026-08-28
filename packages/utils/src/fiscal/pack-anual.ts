/**
 * Pack anual consolidado — Resume todo el año fiscal de un cliente
 * en un solo objeto estructurado para exportación PDF/CSV.
 */

export interface FacturaAnual {
  tipo: 'ingreso' | 'gasto'
  baseImponible: number // céntimos
  iva: number // porcentaje (0, 4, 10, 21)
  total: number // céntimos
  fechaEmision: Date | string
}

export interface PackAnualParams {
  anyo: number
  nombre: string
  nif: string | null
  comunidadFiscal: string | null
  perfilFiscal: string | null
  facturas: FacturaAnual[]
}

export interface ResumenTrimestre {
  trimestre: number
  ingresos: number
  gastos: number
  baseImponibleRepercutida: number
  ivaRepercutido: number
  baseImponibleSoportada: number
  ivaSoportado: number
  ivaNeto: number
}

export interface ResumenIVAAnual {
  totalRepercutido: number
  totalSoportado: number
  netoAnual: number
  porTrimestre: ResumenTrimestre[]
}

export interface ResumenIRPFAnual {
  totalIngresos: number
  totalGastos: number
  beneficioNeto: number
  pagoFraccionadoEstimado: number // 20% beneficio neto
}

export interface ModeloChecklist {
  modelo: string
  descripcion: string
  obligatorio: boolean
  presentado: boolean // por defecto false — el usuario lo marca
}

export interface PackAnualResult {
  cabecera: {
    anyo: number
    nombre: string
    nif: string | null
    comunidadFiscal: string | null
    perfilFiscal: string | null
  }
  resumenFacturas: {
    totalEmitidas: number
    totalRecibidas: number
    ingresos: number
    gastos: number
    beneficioNeto: number
  }
  iva: ResumenIVAAnual
  irpf: ResumenIRPFAnual
  modelos: ModeloChecklist[]
}

function trimestreDeFecha(fecha: Date | string): number {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  const mes = d.getMonth() // 0-11
  return Math.min(3, Math.floor(mes / 3)) + 1 // 1-4
}

/**
 * Calcula el pack anual consolidado a partir de facturas y datos del perfil.
 */
export function calcularPackAnual(params: PackAnualParams): PackAnualResult {
  const { anyo, nombre, nif, comunidadFiscal, perfilFiscal, facturas } = params

  // ── Facturas por trimestre ──
  const facturasAnyo = facturas.filter(f => {
    const d = f.fechaEmision instanceof Date ? f.fechaEmision : new Date(f.fechaEmision)
    return d.getFullYear() === anyo
  })

  const emitidas = facturasAnyo.filter(f => f.tipo === 'ingreso')
  const recibidas = facturasAnyo.filter(f => f.tipo === 'gasto')

  const totalIngresos = emitidas.reduce((s, f) => s + f.total, 0)
  const totalGastos = recibidas.reduce((s, f) => s + f.total, 0)
  const beneficioNeto = totalIngresos - totalGastos

  // ── IVA por trimestre ──
  const ivaPorTrimestre: ResumenTrimestre[] = []

  for (let t = 1; t <= 4; t++) {
    const facturasT = facturasAnyo.filter(f => trimestreDeFecha(f.fechaEmision) === t)
    const ingresosT = facturasT.filter(f => f.tipo === 'ingreso')
    const gastosT = facturasT.filter(f => f.tipo === 'gasto')

    const baseRepercutida = ingresosT.reduce((s, f) => s + f.baseImponible, 0)
    const ivaRepercutido = ingresosT.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
    const baseSoportada = gastosT.reduce((s, f) => s + f.baseImponible, 0)
    const ivaSoportado = gastosT.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)

    ivaPorTrimestre.push({
      trimestre: t,
      ingresos: ingresosT.reduce((s, f) => s + f.total, 0),
      gastos: gastosT.reduce((s, f) => s + f.total, 0),
      baseImponibleRepercutida: baseRepercutida,
      ivaRepercutido,
      baseImponibleSoportada: baseSoportada,
      ivaSoportado,
      ivaNeto: ivaRepercutido - ivaSoportado,
    })
  }

  const totalRepercutido = ivaPorTrimestre.reduce((s, t) => s + t.ivaRepercutido, 0)
  const totalSoportado = ivaPorTrimestre.reduce((s, t) => s + t.ivaSoportado, 0)

  // ── IRPF ──
  const pagoFraccionado = Math.round(beneficioNeto * 0.20)

  // ── Checklist de modelos ──
  const esAutonomo = perfilFiscal === 'autonomo' || !perfilFiscal
  const esSociedad = perfilFiscal === 'sociedad'
  const esEmpleado = perfilFiscal === 'empleado'

  const modelos: ModeloChecklist[] = [
    { modelo: '303', descripcion: 'IVA trimestral', obligatorio: true, presentado: false },
    { modelo: '390', descripcion: 'Resumen anual IVA', obligatorio: true, presentado: false },
    ...(esAutonomo ? [
      { modelo: '130', descripcion: 'Pago fraccionado IRPF', obligatorio: true, presentado: false },
      { modelo: '100', descripcion: 'Declaración de la Renta', obligatorio: true, presentado: false },
    ] : []),
    ...(esSociedad ? [
      { modelo: '200', descripcion: 'Impuesto sobre Sociedades', obligatorio: true, presentado: false },
      { modelo: '202', descripcion: 'Pagos fraccionados IS', obligatorio: true, presentado: false },
    ] : []),
    ...(esEmpleado ? [
      { modelo: '100', descripcion: 'Declaración de la Renta', obligatorio: true, presentado: false },
    ] : []),
    { modelo: '347', descripcion: 'Operaciones con terceros', obligatorio: totalIngresos > 300506, presentado: false },
  ]

  return {
    cabecera: { anyo, nombre, nif, comunidadFiscal, perfilFiscal },
    resumenFacturas: {
      totalEmitidas: emitidas.length,
      totalRecibidas: recibidas.length,
      ingresos: totalIngresos,
      gastos: totalGastos,
      beneficioNeto,
    },
    iva: {
      totalRepercutido,
      totalSoportado,
      netoAnual: totalRepercutido - totalSoportado,
      porTrimestre: ivaPorTrimestre,
    },
    irpf: {
      totalIngresos,
      totalGastos,
      beneficioNeto,
      pagoFraccionadoEstimado: pagoFraccionado,
    },
    modelos,
  }
}

/**
 * Genera datos CSV del pack anual para exportación.
 */
export function packAnualCsv(pack: PackAnualResult): string {
  const lineas: string[] = []
  lineas.push('Pack Anual Fiscal;' + pack.cabecera.anyo)
  lineas.push('Cliente;' + pack.cabecera.nombre + (pack.cabecera.nif ? ';NIF ' + pack.cabecera.nif : ''))
  lineas.push('')

  // Facturas
  lineas.push('RESUMEN DE FACTURAS')
  lineas.push('Concepto;Valor')
  lineas.push('Facturas emitidas;' + pack.resumenFacturas.totalEmitidas)
  lineas.push('Facturas recibidas;' + pack.resumenFacturas.totalRecibidas)
  lineas.push('Ingresos;' + pack.resumenFacturas.ingresos)
  lineas.push('Gastos;' + pack.resumenFacturas.gastos)
  lineas.push('Beneficio neto;' + pack.resumenFacturas.beneficioNeto)
  lineas.push('')

  // IVA
  lineas.push('IVA ANUAL')
  lineas.push('Trimestre;Ingresos;Gastos;Base Repercutida;IVA Repercutido;Base Soportada;IVA Soportado;IVA Neto')
  for (const t of pack.iva.porTrimestre) {
    lineas.push([
      'T' + t.trimestre,
      t.ingresos,
      t.gastos,
      t.baseImponibleRepercutida,
      t.ivaRepercutido,
      t.baseImponibleSoportada,
      t.ivaSoportado,
      t.ivaNeto,
    ].join(';'))
  }
  lineas.push('TOTAL;' + ['', '', '', pack.iva.totalRepercutido, '', pack.iva.totalSoportado, pack.iva.netoAnual].join(';'))
  lineas.push('')

  // IRPF
  lineas.push('IRPF')
  lineas.push('Beneficio neto;' + pack.irpf.beneficioNeto)
  lineas.push('Pago fraccionado estimado (20%);' + pack.irpf.pagoFraccionadoEstimado)

  return lineas.join('\n')
}
