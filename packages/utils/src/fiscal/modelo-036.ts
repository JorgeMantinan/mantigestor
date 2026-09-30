/**
 * Modelo 036/037 — Declaración censal de alta en el censo de empresarios y profesionales.
 *
 * No calcula un impuesto (es un formulario de alta), pero la gestoría necesita orientar
 * al autónomo en dos decisiones clave: el régimen de IVA aplicable y la cuota de RETA.
 * Este módulo asiste esas decisiones con la normativa vigente.
 */

export type TipoActividad = 'empresarial' | 'profesional'
export type RegimenIva = 'simplificado' | 'general' | 'general_simplificado'

export interface DatosModelo036 {
  /** Volumen de operaciones anual estimado (€) */
  volumenOperaciones: number
  /** Tipo de actividad predominante */
  tipoActividad?: TipoActividad
  /** Base de cotización RETA elegida (€/mes) */
  baseCotizacion?: number
  /** Meses con tarifa plana bonificada (0 si no aplica) */
  mesesTarifaPlana?: number
}

export interface ResultadoModelo036 {
  /** IVA simplificado aplicable si volumen ≤ 250.000 € */
  ivsimplificado: boolean
  /** IVA simplificado aplicable solo a actividades agrarias/forestales si volumen ≤ 250.000 € */
  ivsimplificadoAgrario: boolean
  /** Régimen recomendado para el modelo 303/309 (líquido a ingresar del autónomo) */
  regimenRecomendado: RegimenIva
  cuotaRETA: number
  tarifaPlana: number
  hayMinimoProfesional: boolean
  esActividadEconomicaIae: boolean
  resumenAlta: Array<{ titulo: string; descripcion: string }>
}

const LIMITE_REGSIMPLE_250K = 250_000
const LIMITE_REGSIMPLE_AGRARIO = 250_000
// RETA 2026 (Orden PJC/297/2026 y RDL 3/2026): base mínima 653,59 €/mes,
// tipo total de cotización 31,50 % (2025: 31,40 %). Tarifa plana: 80 € + MEI = 88,64 €/mes.
const BASE_MINIMA_RETA_2026 = 653.59
const TIPO_RETA_26 = 0.315
const TARIFA_PLANA_MENSUAL = 88.64

function redondear2(n: number) {
  return Math.round(n * 100) / 100
}

export function calcularModelo036(datos: DatosModelo036): ResultadoModelo036 {
  const volumen = datos.volumenOperaciones
  const esEconomica = volumen < 1_000_000 // nota: la exención de IAE se pierde a partir de 1 M€ de cifra de negocios

  // IVA simplificado: aplica a comercios/hostelería/talleres y a la agricultura/ganadería,
  // siempre que el volumen de operaciones del año anterior no supere 250.000 €.
  const ivsimplificado = volumen <= LIMITE_REGSIMPLE_250K
  const ivsimplificadoAgrario = volumen <= LIMITE_REGSIMPLE_AGRARIO
  const regimenRecomendado: RegimenIva =
    datos.tipoActividad === 'profesional' ? 'general' : ivsimplificado ? 'simplificado' : 'general'

  const base = datos.baseCotizacion ?? BASE_MINIMA_RETA_2026
  // Cotización RETA: base × tipo (2026). La cuota resultante incluye contingencias comunes,
  // profesionales, cese de actividad y formación.
  const cuotaRETA = redondear2(base * TIPO_RETA_26)
  // Cuota con la bonificación por pluriactividad / tarifa plana aplicada los primeros meses
  const meses = Math.min(12, Math.max(0, datos.mesesTarifaPlana ?? 0))
  const tarifaPlana = redondear2(meses * TARIFA_PLANA_MENSUAL)
  // Mínimo profesional para autónomos profesionales: exenciones de IVA solo si es trabajador autónomo
  const hayMinimoProfesional = datos.tipoActividad === 'profesional' && volumen < 1_000_000

  const resumenAlta = [
    {
      titulo: 'Régimen de IVA',
      descripcion:
        regimenRecomendado === 'simplificado'
          ? `Operas con IVA simplificado: cada trimestre liquidas el modelo 303 (y el 131 en IRPF en vez del 130). Tus bases se determinan a partir de módulos objetivos del sector.`
          : `Operas con IVA general: declaras el modelo 303 trimestral y el 390 anual. Emites facturas con IVA en cada venta.`,
    },
    {
      titulo: 'Cuota RETA mensual',
      descripcion: `Con base ${base.toLocaleString('es-ES')} € te corresponde una cuota de ${cuotaRETA.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/mes. Con la tarifa plana de ${meses} meses ahorras ${tarifaPlana.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} en total.`,
    },
    {
      titulo: 'IAE',
      descripcion: esEconomica
        ? 'Al no superar 1 M€ de cifra de negocios estás exento del Impuesto de Actividades Económicas, pero igualmente debes darte de alta en el epígrafe correspondiente declarando tu actividad.'
        : 'Superas 1 M€ de cifra de negocios: estás sujeto al Impuesto de Actividades Económicas (IAE) en el 036.',
    },
    {
      titulo: 'Plazos',
      descripcion: 'La declaración de alta censal (036/037) se presenta con carácter previo al inicio de la actividad (antes de emitir la primera factura). El plazo es hasta el día natural previo al comienzo de actividad. La variación o baja se comunica en el mes siguiente.',
    },
  ]

  return {
    ivsimplificado,
    ivsimplificadoAgrario,
    regimenRecomendado,
    cuotaRETA,
    tarifaPlana,
    hayMinimoProfesional,
    esActividadEconomicaIae: esEconomica,
    resumenAlta,
  }
}
