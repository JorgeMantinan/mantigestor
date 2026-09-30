/**
 * Utilidades de nómina: cálculo automático IRPF, seguridad social, pagas extra, finiquito.
 */

import { calcularModelo145, type DatosModelo145 } from './modelo-145'

/** Constantes SS 2026 (trabajador por cuenta ajena, contrato indefinido) */
const SS_CONTINGENCIAS_COMUNES_PCT = 0.047 // 4,70% contingencias comunes
const SS_DESEMPLEO_PCT = 0.0155 // 1,55% desempleo (contrato indefinido)
const SS_FORMACION_PCT = 0.001 // 0,10% formación profesional
const SS_MEI_PCT = 0.0015 // 0,15% MEI (mecanismo de equidad intergeneracional)
const SS_TOTAL_EMPLEADO_PCT = SS_CONTINGENCIAS_COMUNES_PCT + SS_DESEMPLEO_PCT + SS_FORMACION_PCT + SS_MEI_PCT // 6,50%

export interface DatosNomina {
  salarioBrutoMensual: number // €
  pagasExtra?: number //数量 de pagas extra (0 o 1 por defecto)
  tieneDescuentoPagaExtra?: boolean // Si la paga extra está prorrateada en 12 mensualidades
  hijos?: number
  discapacidadPct?: number
  otrosGastos?: number
}

export interface ResultadoNomina {
  salarioBrutoMensual: number
  pagaExtraBruto: number
  seguridadSocial: number // € mensual
  baseImponibleIRPF: number
  tipoIRPF: number // %
  retencionIRPF: number // € mensual
  salarioNetoMensual: number
  salarioNetoAnual: number
  totalDeducciones: number
  /** Desglose para el ticket de nómina */
  desglose: {
    brutoAnual: number
    ssAnual: number
    irpfAnual: number
    netoAnual: number
  }
}

/**
 * Calcula nómina completa con IRPF automático usando Modelo 145.
 */
export function calcularNomina(datos: DatosNomina): ResultadoNomina {
  const brutoMensual = datos.salarioBrutoMensual
  const pagasExtra = datos.pagasExtra ?? 0

  // Salario bruto anual incluyendo pagas extra
  const brutoAnual = brutoMensual * 12 + brutoMensual * pagasExtra

  // SS empleado (sobre bruto anual)
  const ssAnual = brutoAnual * SS_TOTAL_EMPLEADO_PCT
  const ssMensual = ssAnual / 12

  // IRPF automático via Modelo 145
  const datos145: DatosModelo145 = {
    salarioBrutoAnual: brutoAnual,
    numeroPagadores: 1,
    hijos: datos.hijos ?? 0,
    discapacidadPct: datos.discapacidadPct ?? 0,
    otrosGastos: datos.otrosGastos ?? 0,
  }
  const resultado145 = calcularModelo145(datos145)
  const tipoIRPF = resultado145.tipoRetencionPct

  // Retención IRPF mensual
  const irpfAnual = brutoAnual * (tipoIRPF / 100)
  const irpfMensual = irpfAnual / 12

  // Neto
  const netoMensual = brutoMensual - ssMensual - irpfMensual
  const netoAnual = brutoAnual - ssAnual - irpfAnual

  return {
    salarioBrutoMensual: brutoMensual,
    pagaExtraBruto: pagasExtra > 0 ? brutoMensual : 0,
    seguridadSocial: Math.round(ssMensual * 100) / 100,
    baseImponibleIRPF: brutoMensual,
    tipoIRPF: Math.round(tipoIRPF * 100) / 100,
    retencionIRPF: Math.round(irpfMensual * 100) / 100,
    salarioNetoMensual: Math.round(netoMensual * 100) / 100,
    salarioNetoAnual: Math.round(netoAnual * 100) / 100,
    totalDeducciones: Math.round((ssMensual + irpfMensual) * 100) / 100,
    desglose: {
      brutoAnual: Math.round(brutoAnual * 100) / 100,
      ssAnual: Math.round(ssAnual * 100) / 100,
      irpfAnual: Math.round(irpfAnual * 100) / 100,
      netoAnual: Math.round(netoAnual * 100) / 100,
    },
  }
}

export interface DatosFiniquito {
  salarioBrutoMensual: number
  diasTrabajadosMes: number
  diasVacacionesPendientes: number
  pagasExtraPendientes: number // 0, 0.5 o 1
  tipoIRPF: number // % (usar el del último nomina o calcular)
}

export interface ResultadoFiniquito {
  parteProporcional: number // Bruto por días trabajados
  vacacionesPendientes: number
  pagasExtraPendientes: number
  brutoTotal: number
  irpf: number
  neto: number
}

/**
 * Calcula finiquito laboral.
 */
export function calcularFiniquito(datos: DatosFiniquito): ResultadoFiniquito {
  const brutoDiario = datos.salarioBrutoMensual / 30
  const parteProporcional = brutoDiario * datos.diasTrabajadosMes
  const vacaciones = brutoDiario * datos.diasVacacionesPendientes
  const pagasExtra = datos.salarioBrutoMensual * datos.pagasExtraPendientes

  const brutoTotal = parteProporcional + vacaciones + pagasExtra
  const irpf = brutoTotal * (datos.tipoIRPF / 100)
  const neto = brutoTotal - irpf

  return {
    parteProporcional: Math.round(parteProporcional * 100) / 100,
    vacacionesPendientes: Math.round(vacaciones * 100) / 100,
    pagasExtraPendientes: Math.round(pagasExtra * 100) / 100,
    brutoTotal: Math.round(brutoTotal * 100) / 100,
    irpf: Math.round(irpf * 100) / 100,
    neto: Math.round(neto * 100) / 100,
  }
}
