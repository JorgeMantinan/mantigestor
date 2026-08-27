/**
 * Modelo 349 — Declaración informativa de operaciones intracomunitarias
 * Operaciones con empresarios/profesionales de otros estados miembros de la UE
 */

export interface OperacionIntracomunitaria {
  tercero: string
  nif: string
  pais: string
  tipo: 'entrega' | 'adquisicion' | 'servicios'
  baseImponible: number
}

export interface DatosModelo349 {
  operaciones: OperacionIntracomunitaria[]
  periodo: 'trimestral' | 'mensual'
}

export interface ResultadoModelo349 {
  totalEntregas: number
  totalAdquisiciones: number
  totalServicios: number
  numOperaciones: number
  porPais: Record<string, { entregas: number; adquisiciones: number; servicios: number }>
  debePresentar: boolean
  resumen: string
}

export function calcularModelo349(datos: DatosModelo349): ResultadoModelo349 {
  const { operaciones } = datos

  const totalEntregas = operaciones
    .filter(op => op.tipo === 'entrega')
    .reduce((sum, op) => sum + op.baseImponible, 0)

  const totalAdquisiciones = operaciones
    .filter(op => op.tipo === 'adquisicion')
    .reduce((sum, op) => sum + op.baseImponible, 0)

  const totalServicios = operaciones
    .filter(op => op.tipo === 'servicios')
    .reduce((sum, op) => sum + op.baseImponible, 0)

  const numOperaciones = operaciones.length

  const porPais: Record<string, { entregas: number; adquisiciones: number; servicios: number }> = {}
  const claveTipo: Record<OperacionIntracomunitaria['tipo'], 'entregas' | 'adquisiciones' | 'servicios'> = {
    entrega: 'entregas',
    adquisicion: 'adquisiciones',
    servicios: 'servicios',
  }
  for (const op of operaciones) {
    if (!porPais[op.pais]) {
      porPais[op.pais] = { entregas: 0, adquisiciones: 0, servicios: 0 }
    }
    const entry = porPais[op.pais]
    if (entry) {
      const clave = claveTipo[op.tipo]
      entry[clave] = (entry[clave] ?? 0) + op.baseImponible
    }
  }

  const debePresentar = numOperaciones > 0

  const resumen = debePresentar
    ? `${numOperaciones} operación(es) intracomunitarias declaradas`
    : `No hay operaciones intracomunitarias para declarar`

  return {
    totalEntregas,
    totalAdquisiciones,
    totalServicios,
    numOperaciones,
    porPais,
    debePresentar,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
