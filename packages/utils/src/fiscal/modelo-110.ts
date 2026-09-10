/**
 * Modelo 110 — Declaración-resumen anual de otras retenciones e ingresos a cuenta del IRPF.
 *
 * Se presenta por retenciones que no tienen un modelo propio (111, 115, 123, etc.): capital
 * inmobiliario distinto del arrendamiento, premios, ganancias patrimoniales no derivadas de
 * inmuebles, importes en especie, etc. Constituye la declaración trimestral de esas retenciones
 * practicadas (modelo 110 trimestral) y su resumen anual (modelo 110 anual).
 */

export type TipoRetencion110 =
  | 'capitalInmobiliario'
  | 'premios'
  | 'gananciaPatrimonial'
  | 'especie'
  | 'otros'

export interface Fila110 {
  tipo: TipoRetencion110
  /** Importe bruto satisfecho (€) */
  importe: number
  /** Tipo de retención aplicado (%) */
  tipoRetencion: number
}

export interface DatosModelo110 {
  /** Trimestre (1-4) o 'anual' para el resumen del año */
  periodo: number | 'anual'
  filas: Fila110[]
}

export interface ResultadoModelo110 {
  baseTotal: number
  retencionTotal: number
  nFilas: number
  detalle: Fila110Resultado[]
  avisos: string[]
}

export interface Fila110Resultado {
  tipo: TipoRetencion110
  base: number
  retencion: number
}

// Tipos de retención orientativos por categoría (rango habitual)
const TIPOS_REF: Record<TipoRetencion110, { min: number; max: number }> = {
  capitalInmobiliario: { min: 19, max: 23 },
  premios: { min: 19, max: 23 },
  gananciaPatrimonial: { min: 15, max: 23 },
  especie: { min: 19, max: 23 },
  otros: { min: 19, max: 23 },
}

export function calcularModelo110(datos: DatosModelo110): ResultadoModelo110 {
  const avisos: string[] = []
  const detalle: Fila110Resultado[] = []

  let baseTotal = 0
  let retencionTotal = 0

  for (const fila of datos.filas) {
    const importe = Math.max(0, fila.importe)
    const tipoRet = Math.max(0, fila.tipoRetencion)
    const retencion = Math.round(importe * (tipoRet / 100) * 100) / 100
    baseTotal += importe
    retencionTotal += retencion
    detalle.push({ tipo: fila.tipo, base: importe, retencion })
  }

  if (datos.periodo === 'anual') {
    avisos.push(
      'Resumen anual: cuando el conjunto de retenciones anuales supere los límites exentos, debes presentar el modelo 110 anual antes del 30 de enero del año siguiente.'
    )
  } else {
    avisos.push(
      'Declaración trimestral: los importes se ingresan en los 20 primeros días del mes siguiente al trimestre (hasta el 20 de enero, abril, julio y octubre).'
    )
  }

  const tiposAviso = datos.filas
    .filter(f => {
      const ref = TIPOS_REF[f.tipo]
      return f.tipoRetencion > 0 && (f.tipoRetencion < ref.min || f.tipoRetencion > ref.max)
    })
  if (tiposAviso.length > 0) {
    avisos.push(
      `Algún tipo de retención (${tiposAviso.map(f => `${f.tipoRetencion}%`).join(', ')}) está fuera del rango habitual (19%-23%); revisa que el tipo aplicado sea correcto.`
    )
  }

  return {
    baseTotal,
    retencionTotal,
    nFilas: datos.filas.length,
    detalle,
    avisos,
  }
}
