'use client'

export type NivelDeducibilidad = 'total' | 'parcial' | 'no_deducible'

export interface GastoClasificado {
  categoriaGasto: string
  descripcion: string
  porcentajeDeducible: number
  nivel: NivelDeducibilidad
  documentacionRequerida: string
  notas?: string
}

interface ReglaClasificacion {
  patron: RegExp
  categoria: string
  porcentaje: number
  nivel: NivelDeducibilidad
  documentacion: string
  notas?: string
}

const REGLAS: ReglaClasificacion[] = [
  // SIEMPRE DEDUCIBLES (100%)
  { patron: /suministro|agua|luz|electricidad|gas|internet|tel[eé]fono|m[oó]vil/i, categoria: 'Suministros', porcentaje: 100, nivel: 'total', documentacion: 'Factura del suministro' },
  { patron: /alquiler.*local|alquiler.*oficina|arrendamiento.*local/i, categoria: 'Alquiler local', porcentaje: 100, nivel: 'total', documentacion: 'Contrato de arrendamiento + factura' },
  { patron: /material.*oficina|papel|t[oó]ner|cartuchos|archivo/i, categoria: 'Material oficina', porcentaje: 100, nivel: 'total', documentacion: 'Factura de compra' },
  { patron: /software|licencia|hosting|dominio|servidor|cloud|nube/i, categoria: 'Software', porcentaje: 100, nivel: 'total', documentacion: 'Factura de licencia/subscription' },
  { patron: /contable|gestor[ií]a|asesor[ií]a|abogado|legal/i, categoria: 'Profesionales', porcentaje: 100, nivel: 'total', documentacion: 'Factura del profesional' },
  { patron: /seguro.*responsabilidad|seguro.*profesional/i, categoria: 'Seguros', porcentaje: 100, nivel: 'total', documentacion: 'Póliza + factura' },
  { patron: /formaci[oó]n|curso|capacitaci[oó]n|seminario/i, categoria: 'Formación', porcentaje: 100, nivel: 'total', documentacion: 'Factura + certificado de asistencia' },
  { patron: /libro|publicaci[oó]n|revista.*profesional/i, categoria: 'Formación', porcentaje: 100, nivel: 'total', documentacion: 'Factura de compra' },
  { patron: /parking|peaje|autopista/i, categoria: 'Transporte', porcentaje: 100, nivel: 'total', documentacion: 'Ticket / factura' },
  { patron: /transporte.*p[uú]blico|metro|bus|cercan[ií]as|ave|renfe/i, categoria: 'Transporte', porcentaje: 100, nivel: 'total', documentacion: 'Billete o abono' },
  { patron: /comisi[oó]n.*banco|gasto.*bancario|maintenence.*fee/i, categoria: 'Gastos financieros', porcentaje: 100, nivel: 'total', documentacion: 'Extracto bancario' },
  { patron: /telefono|phone|movil|celular/i, categoria: 'Suministros', porcentaje: 100, nivel: 'total', documentacion: 'Factura del servicio' },

  // PARCIALMENTE DEDUCIBLES
  { patron: /gasolina|fuel|combustible|carburante/i, categoria: 'Transporte', porcentaje: 50, nivel: 'parcial', documentacion: 'Ticket gasolinera + libro de gastos', notas: 'Solo gasto/% uso profesional. Si vehículo mixto: 50%' },
  { patron: /dieta|comida.*trabajo|almuerzo.*negocio|manutenci[oó]n/i, categoria: 'Dietas y manutención', porcentaje: 100, nivel: 'parcial', documentacion: 'Ticket/factura + justificativo viaje/reunión', notas: 'Máx. 26,67€/día sin pernocta, 53,34€/con pernocta (2026)' },
  { patron: /viaje|hotel|alojamiento|billete.*avion/i, categoria: 'Viajes', porcentaje: 100, nivel: 'parcial', documentacion: 'Billete / factura hotel + justificativo viaje', notas: 'Solo si desplazamiento por motivo profesional' },
  { patron: /seguro.*médico|mutua|sanitario/i, categoria: 'Seguros', porcentaje: 100, nivel: 'parcial', documentacion: 'Póliza + recibo domiciliado', notas: 'Deducible para autónomos con empleados. Consultar' },
  { patron: /reparaci[oó]n|arreglo|mantenimiento/i, categoria: 'Mantenimiento', porcentaje: 50, nivel: 'parcial', documentacion: 'Factura del técnico', notas: 'Deducible si es para elementso profesionales. Mixto: 50%' },
  { patron: /equipamiento|ordenador|port[aá]til|monitor|impresora/i, categoria: 'Material oficina', porcentaje: 100, nivel: 'parcial', documentacion: 'Factura de compra', notas: 'Amortizable si > 300€' },

  // NO DEDUCIBLES
  { patron: /multa|sanci[oó]n|penalizaci[oó]n|infracci[oó]n/i, categoria: 'Sanciones', porcentaje: 0, nivel: 'no_deducible', documentacion: 'No deducible', notas: 'Multas y sanciones nunca son deducibles' },
  { patron: /donaci[oó]n|beneficencia/i, categoria: 'Donaciones', porcentaje: 0, nivel: 'no_deducible', documentacion: 'No deducible directamente', notas: 'Deducible en IRPF (hasta 10% base) pero no en IVA' },
  { patron: /aportaci[oó]n.*pensi[oó]n|plan.*pensi[oó]n/i, categoria: 'Ahorro', porcentaje: 0, nivel: 'no_deducible', documentacion: 'No deducible como gasto', notas: 'Reducción en IRPF, no gasto deducible' },
  { patron: /impuesto|tributo|tasa.*ayuntamiento.*basura/i, categoria: 'Impuestos', porcentaje: 0, nivel: 'no_deducible', documentacion: 'No deducible', notas: 'Impuestos no son gasto deducible (excepto IVA soportado)' },
]

export function clasificarGasto(descripcion: string, categoriaGasto?: string | null): GastoClasificado {
  const texto = `${descripcion} ${categoriaGasto ?? ''}`.toLowerCase()

  for (const regla of REGLAS) {
    if (regla.patron.test(texto)) {
      return {
        categoriaGasto: regla.categoria,
        descripcion: regla.categoria,
        porcentajeDeducible: regla.porcentaje,
        nivel: regla.nivel,
        documentacionRequerida: regla.documentacion,
        notas: regla.notas,
      }
    }
  }

  return {
    categoriaGasto: 'Otros',
    descripcion: 'No clasificado',
    porcentajeDeducible: 0,
    nivel: 'parcial',
    documentacionRequerida: 'Consultar con asesor fiscal',
    notas: 'Gasto no reconocido. Revisar clasificación manual.',
  }
}

export function clasificarGastos(gastos: { emisorReceptor: string; categoriaGasto?: string | null; baseImponible: number; deducible?: boolean | null }[]): {
  totalGastado: number
  totalDeducible: number
  totalNoDeducible: number
  porDeducir: number
  desglose: { clasificacion: GastoClasificado; importe: number }[]
} {
  let totalGastado = 0
  let totalDeducible = 0
  let totalNoDeducible = 0
  let porDeducir = 0
  const desglose: { clasificacion: GastoClasificado; importe: number }[] = []

  for (const g of gastos) {
    const clasificacion = clasificarGasto(g.emisorReceptor, g.categoriaGasto)
    totalGastado += g.baseImponible

    if (clasificacion.nivel === 'no_deducible') {
      totalNoDeducible += g.baseImponible
    } else {
      const deducible = Math.round(g.baseImponible * (clasificacion.porcentajeDeducible / 100))
      totalDeducible += deducible
    }

    if (g.deducible === null || g.deducible === undefined) {
      porDeducir += g.baseImponible
    }

    desglose.push({ clasificacion, importe: g.baseImponible })
  }

  return { totalGastado, totalDeducible, totalNoDeducible, porDeducir, desglose }
}

export const CATEGORIAS_DEDUCIBLES: { label: string; value: string }[] = [
  { label: 'Suministros', value: 'suministros' },
  { label: 'Alquiler', value: 'alquiler' },
  { label: 'Material oficina', value: 'material-oficina' },
  { label: 'Software', value: 'software' },
  { label: 'Profesionales', value: 'profesionales' },
  { label: 'Transporte', value: 'transporte' },
  { label: 'Dietas', value: 'dietas' },
  { label: 'Formación', value: 'formacion' },
  { label: 'Seguros', value: 'seguros' },
  { label: 'Otros', value: 'otros' },
]
