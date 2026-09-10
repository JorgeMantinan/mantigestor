/**
 * Modelo 200 — Impuesto sobre Sociedades (declaración anual)
 *
 * Tipos de declarante:
 * - Sociedad limitada (SL)
 * - Sociedad anónima (SA)
 * - Sociedad comanditaria
 * - Sociedad cooperativa
 * - Otras entidades
 *
 * Tipo general: 25%
 * Empresas de nueva creación: 15% (2 años)
 * Entidades de reducida dimensión (<1M€): 23%
 * Entidades en régimen de consolidación: 25%
 */

export interface DatosModelo200 {
  tipoEntidad: 'SL' | 'SA' | 'cooperativa' | 'comanditaria' | 'otra'
  cif: string
  denominacion: string
  ejercicio: number
  fechaInicio: string
  fechaFin: string
  esNuevaCreacion: boolean

  // Resultados económicos
  ingresosExplotacion: number      // Cifra de negocios
  otrosIngresos: number
  gastosExplotacion: number
  gastosFinancieros: number
  resultadosExtranjeros: number

  // Base imponible
  resultadoContable: number
  ajustesFiscales: number         // Positivos (adds) o negativos (subs)
  baseImponible: number

  // Compensación de bases imponibles negativas
  basesNegativasArrastradas: number
  basesNegativasAnoActual: number

  // Cuota íntegra
  tipoImpositivo: number
  cuotaIntegra: number

  // Deducciones
  deducciones: number
  cuotaLiquida: number

  // Pagos fraccionados realizados
  pagosFraccionados: number
  retenciones: number
  percepiones: number

  // Resultado
  resultadoADevolver: number
  resultadoAPagar: number
}

export interface ResultadoModelo200 {
  tipoImpositivo: number
  cuotaIntegra: number
  deducciones: number
  cuotaLiquida: number
  totalAPagar: number
  totalADevolver: number
  esNuevaCreacion: boolean
  observaciones: string[]
}

/**
 * Determina el tipo impositivo según la entidad
 */
export function tipoImpositivo(tipoEntidad: string, esNuevaCreacion: boolean, facturacion: number): number {
  if (esNuevaCreacion) return 15 // 2 primeros años
  if (tipoEntidad === 'cooperativa') return 20
  if (facturacion < 1_000_000) return 23 // Reducida dimensión
  return 25 // General
}

export function calcularModelo200(datos: DatosModelo200): ResultadoModelo200 {
  const observaciones: string[] = []

  // Calcular tipo impositivo
  const esNuevaCreacion = datos.esNuevaCreacion
  const facturacion = datos.ingresosExplotacion
  const tipo = tipoImpositivo(datos.tipoEntidad, esNuevaCreacion, facturacion)

  // Base imponible = resultado contable + ajustes - bases negativas
  const baseImponible = Math.max(0,
    datos.resultadoContable + datos.ajustesFiscales - datos.basesNegativasArrastradas
  )

  // Cuota íntegra
  const cuotaIntegra = Math.round(baseImponible * tipo / 100)

  // Cuota líquida = cuota íntegra - deducciones
  const cuotaLiquida = Math.max(0, cuotaIntegra - datos.deducciones)

  // Resultado
  const totalAPagar = Math.max(0,
    cuotaLiquida - datos.pagosFraccionados - datos.retenciones - datos.percepiones
  )
  const totalADevolver = Math.max(0,
    datos.pagosFraccionados + datos.retenciones + datos.percepiones - cuotaLiquida
  )

  // Observaciones
  if (tipo === 15) {
    observaciones.push('Tipo reducido 15% para entidades de nueva creación (2 primeros ejercicios)')
  } else if (tipo === 23) {
    observaciones.push('Tipo reducido 23% para entidades de reducida dimensión (<1M€ facturación)')
  } else {
    observaciones.push('Tipo general 25%')
  }

  if (datos.basesNegativasArrastradas > 0) {
    observaciones.push(`Bases negativas anteriores: ${formatEUR(datos.basesNegativasArrastradas)} compensadas`)
  }

  if (datos.pagosFraccionados > 0) {
    observaciones.push(`Pagos fraccionados: ${formatEUR(datos.pagosFraccionados)} deducidos`)
  }

  if (totalADevolver > 0) {
    observaciones.push(`Resultado a devolver: ${formatEUR(totalADevolver)}`)
  }

  return {
    tipoImpositivo: tipo,
    cuotaIntegra,
    deducciones: datos.deducciones,
    cuotaLiquida,
    totalAPagar,
    totalADevolver,
    esNuevaCreacion,
    observaciones,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

// Tipos de entidad
export const TIPOS_ENTIDAD = [
  { valor: 'SL', label: 'Sociedad Limitada (SL)' },
  { valor: 'SA', label: 'Sociedad Anónima (SA)' },
  { valor: 'cooperativa', label: 'Sociedad Cooperativa' },
  { valor: 'comanditaria', label: 'Sociedad Comanditaria' },
  { valor: 'otra', label: 'Otra entidad' },
] as const
