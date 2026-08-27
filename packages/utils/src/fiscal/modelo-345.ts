/**
 * Modelo 345 — Información sobre planes de pensiones, planes de ahorro a largo plazo,
 * sistemas de previsión social, Mutualidades de Previsión Social y planes de previsión
 * empresarial.
 * Obligatorio para entidades gestoras, depositarias y aseguradoras.
 * También para empleadores que realicen contribuciones a planes de pensiones de empleo.
 */

export interface ContribucionPlan {
  tipoPlan: 'pension' | 'ahorro_largo_plazo' | 'prevision_social' | 'mutualidad' | 'pension_empresa' | 'pension_empleo'
  titularNif: string
  titularNombre: string
  contribucionEmpresa: number
  contribucionTrabajador: number
  contribucionesDisposicion: number
  valorLiquido: number
}

export interface DatosModelo345 {
  ejercicio: number
  contribuciones: ContribucionPlan[]
}

export interface ResultadoModelo345 {
  numTitulares: number
  totalContribucionesEmpresa: number
  totalContribucionesTrabajador: number
  totalDisposiciones: number
  totalValorLiquido: number
  porTipo: Record<string, { numTitulares: number; total: number }>
  obligatorio: boolean
  resumen: string
}

const LABELS_TIPO: Record<ContribucionPlan['tipoPlan'], string> = {
  pension: 'Planes de pensiones',
  ahorro_largo_plazo: 'Planes de ahorro a largo plazo',
  prevision_social: 'Sistemas de previsión social',
  mutualidad: 'Mutualidades de previsión',
  pension_empresa: 'Planes de previsión empresarial',
  pension_empleo: 'Planes de pensiones de empleo',
}

export function calcularModelo345(datos: DatosModelo345): ResultadoModelo345 {
  const { contribuciones } = datos

  const porTipo: Record<string, { numTitulares: number; total: number }> = {}
  let totalContribucionesEmpresa = 0
  let totalContribucionesTrabajador = 0
  let totalDisposiciones = 0
  let totalValorLiquido = 0

  for (const c of contribuciones) {
    totalContribucionesEmpresa += c.contribucionEmpresa
    totalContribucionesTrabajador += c.contribucionTrabajador
    totalDisposiciones += c.contribucionesDisposicion
    totalValorLiquido += c.valorLiquido

    const label = LABELS_TIPO[c.tipoPlan]
    const entry = porTipo[label] ?? { numTitulares: 0, total: 0 }
    entry.numTitulares++
    entry.total += c.contribucionEmpresa + c.contribucionTrabajador
    porTipo[label] = entry
  }

  const numTitulares = contribuciones.length
  const obligatorio = numTitulares > 0

  const totalGlobal = totalContribucionesEmpresa + totalContribucionesTrabajador

  const resumen = obligatorio
    ? `${numTitulares} titular(es) · Contribuciones totales: ${formatEUR(totalGlobal)} · Disposiciones: ${formatEUR(totalDisposiciones)}`
    : 'Sin contribuciones a planes registradas'

  return {
    numTitulares,
    totalContribucionesEmpresa,
    totalContribucionesTrabajador,
    totalDisposiciones,
    totalValorLiquido,
    porTipo,
    obligatorio,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
