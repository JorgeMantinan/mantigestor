/**
 * Modelo 282 — Declaración informativa anual de ayudas recibidas en el marco del
 * Régimen Económico y Fiscal de Canarias (REF) y otras ayudas de Estado
 * derivadas de la aplicación del Derecho de la Unión Europea.
 *
 * Aprobado por la Orden HAP/296/2016 (BOE 5-3-2016).
 * Plazo (art. 4): el establecido para la autoliquidación del IRPF, IS o IRNR del
 * contribuyente en relación con el año natural inmediato anterior.
 * Contenido: identificación de la ayuda (organismo, concepto, norma), ejercicio
 * y cuantía percibida.
 */

export interface Ayuda282 {
  /** Organismo o entidad que concede la ayuda */
  organismo: string
  /** Concepto de la ayuda (p. ej. «Ayuda REF Canarias — inversión») */
  concepto: string
  /** Ejercicio al que se refiere la ayuda */
  ejercicio: number
  /** Importe percibido en céntimos */
  importeCents: number
}

export interface DatosModelo282 {
  ayudas: Ayuda282[]
}

export interface ResultadoModelo282 {
  numAyudas: number
  totalCents: number
  porEjercicio: Array<{ ejercicio: number; totalCents: number }>
  avisos: string[]
}

export function calcularModelo282(datos: DatosModelo282): ResultadoModelo282 {
  const avisos: string[] = []
  let totalCents = 0
  const porEjercicio = new Map<number, number>()

  for (const ayuda of datos.ayudas) {
    const importe = Math.max(0, ayuda.importeCents)
    totalCents += importe
    porEjercicio.set(ayuda.ejercicio, (porEjercicio.get(ayuda.ejercicio) ?? 0) + importe)
    if (!ayuda.organismo.trim()) avisos.push(`Indica el organismo concedente de «${ayuda.concepto}».`)
  }

  return {
    numAyudas: datos.ayudas.length,
    totalCents,
    porEjercicio: [...porEjercicio.entries()]
      .map(([ejercicio, total]) => ({ ejercicio, totalCents: total }))
      .sort((a, b) => a.ejercicio - b.ejercicio),
    avisos,
  }
}
