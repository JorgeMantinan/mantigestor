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
 * Tipos (art. 29 LIS y DT 44ª LIS, ejercicios 2024-2029):
 * - Tipo general: 25%
 * - Empresas de nueva creación: 15% (2 años)
 * - Micropymes (INCN <1M€): escala progresiva 19/21% (2026), 21/22% (2025), 23% (2024 y ant.)
 * - Reducida dimensión (INCN 1-10M€): 23% (2026), 24% (2025), 25% (2024 y ant.)
 * - Cooperativa: resultados cooperativos de entidad fiscalmente protegida, 20%
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

export interface TramoImpositivo {
  hasta: number | null // € (null = resto de la base imponible)
  tipo: number // %
}

/**
 * Escala del tipo impositivo según dimensión (INCN) y ejercicio.
 * - INCN < 1M€ (micropymes): escala progresiva desde 2025
 * - INCN 1-10M€ (reducida dimensión): tipo decreciente 2025-2029
 * - INCN ≥ 10M€: tipo general 25%
 */
export function escalaImpositiva(
  tipoEntidad: string,
  esNuevaCreacion: boolean,
  facturacion: number,
  ejercicio: number = 2026,
): TramoImpositivo[] {
  if (esNuevaCreacion) return [{ hasta: null, tipo: 15 }]
  // Cooperativa: se asume entidad fiscalmente protegida (resultados cooperativos, 20%)
  if (tipoEntidad === 'cooperativa') return [{ hasta: null, tipo: 20 }]
  if (facturacion < 1_000_000) {
    if (ejercicio <= 2024) return [{ hasta: null, tipo: 23 }]
    if (ejercicio === 2025) return [{ hasta: 50_000, tipo: 21 }, { hasta: null, tipo: 22 }]
    if (ejercicio === 2026) return [{ hasta: 50_000, tipo: 19 }, { hasta: null, tipo: 21 }]
    return [{ hasta: 50_000, tipo: 17 }, { hasta: null, tipo: 20 }] // 2027 en adelante
  }
  if (facturacion <= 10_000_000) {
    if (ejercicio <= 2024) return [{ hasta: null, tipo: 25 }]
    if (ejercicio === 2025) return [{ hasta: null, tipo: 24 }]
    if (ejercicio === 2026) return [{ hasta: null, tipo: 23 }]
    if (ejercicio === 2027) return [{ hasta: null, tipo: 22 }]
    if (ejercicio === 2028) return [{ hasta: null, tipo: 21 }]
    return [{ hasta: null, tipo: 20 }] // 2029 en adelante
  }
  return [{ hasta: null, tipo: 25 }]
}

/**
 * Determina el tipo impositivo (marginal, último tramo de la escala aplicable)
 */
export function tipoImpositivo(
  tipoEntidad: string,
  esNuevaCreacion: boolean,
  facturacion: number,
  ejercicio: number = 2026,
): number {
  const escala = escalaImpositiva(tipoEntidad, esNuevaCreacion, facturacion, ejercicio)
  return escala[escala.length - 1]?.tipo ?? 25
}

function cuotaPorEscala(baseEur: number, escala: TramoImpositivo[]): number {
  if (baseEur <= 0) return 0
  let cuota = 0
  let desde = 0
  for (const t of escala) {
    if (baseEur <= desde) break
    const hasta = t.hasta === null ? baseEur : Math.min(t.hasta, baseEur)
    cuota += ((hasta - desde) * t.tipo) / 100
    desde = t.hasta === null ? baseEur : t.hasta
  }
  return Math.round(cuota)
}

function tipoMarginal(baseEur: number, escala: TramoImpositivo[]): number {
  for (const t of escala) {
    if (t.hasta === null || baseEur <= t.hasta) return t.tipo
  }
  return escala[escala.length - 1]?.tipo ?? 25
}

export function calcularModelo200(datos: DatosModelo200): ResultadoModelo200 {
  const observaciones: string[] = []

  // Escala impositiva por dimensión y ejercicio
  const esNuevaCreacion = datos.esNuevaCreacion
  const facturacion = datos.ingresosExplotacion
  const escala = escalaImpositiva(datos.tipoEntidad, esNuevaCreacion, facturacion, datos.ejercicio)

  // Base imponible = resultado contable + ajustes - bases negativas (en €)
  const baseImponible = Math.max(0,
    datos.resultadoContable + datos.ajustesFiscales - datos.basesNegativasArrastradas
  )

  // Cuota íntegra (escala progresiva si la entidad es micropyme)
  const tipo = tipoMarginal(baseImponible, escala)
  const cuotaIntegra = cuotaPorEscala(baseImponible, escala)

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
  if (esNuevaCreacion) {
    observaciones.push('Tipo reducido 15% para entidades de nueva creación (2 primeros ejercicios)')
  } else if (escala.length > 1) {
    const tramos = escala
      .map(t => `${t.tipo}% ${t.hasta === null ? 'para el resto' : `hasta ${t.hasta.toLocaleString('es-ES')}€`}`)
      .join(' y ')
    observaciones.push(`Escala de micropyme (INCN <1M€): ${tramos}`)
  } else if (facturacion > 1_000_000 && facturacion <= 10_000_000) {
    observaciones.push(`Tipo ${tipo}% para entidades de reducida dimensión (INCN ≤10M€, ejercicio ${datos.ejercicio})`)
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

function formatEUR(importeEur: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(importeEur)
}

// Tipos de entidad
export const TIPOS_ENTIDAD = [
  { valor: 'SL', label: 'Sociedad Limitada (SL)' },
  { valor: 'SA', label: 'Sociedad Anónima (SA)' },
  { valor: 'cooperativa', label: 'Sociedad Cooperativa' },
  { valor: 'comanditaria', label: 'Sociedad Comanditaria' },
  { valor: 'otra', label: 'Otra entidad' },
] as const
