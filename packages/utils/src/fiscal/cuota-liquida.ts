import { calcularCuotaEscala, type EscalaIrpf, type ResultadoCuotaEscala } from './irpf'

export const ESCALA_AHORRO_TRAMOS = [
  { hastaEur: 6000, tipoPct: 9.5 },
  { desdeEur: 6000, hastaEur: 50000, tipoPct: 10.5 },
  { desdeEur: 50000, hastaEur: 200000, tipoPct: 11.5 },
  { desdeEur: 200000, hastaEur: 300000, tipoPct: 13.5 },
  { desdeEur: 300000, hastaEur: null, tipoPct: 15 },
] as const

export function escalaAhorroComun(taxYear: number): Array<EscalaIrpf> {
  return [
    {
      ambito: 'ESTATAL',
      comunidad: null,
      taxYear,
      tramos: ESCALA_AHORRO_TRAMOS.map((t, i) => ({
        tramo: i + 1,
        desdeEur: 'desdeEur' in t ? t.desdeEur : 0,
        hastaEur: t.hastaEur,
        tipoPct: t.tipoPct,
      })),
    },
    {
      ambito: 'AUTONOMICO',
      comunidad: null,
      taxYear,
      tramos: ESCALA_AHORRO_TRAMOS.map((t, i) => ({
        tramo: i + 1,
        desdeEur: 'desdeEur' in t ? t.desdeEur : 0,
        hastaEur: t.hastaEur,
        tipoPct: t.tipoPct,
      })),
    },
  ]
}

export interface EntradasCuotaLiquida {
  baseGeneralCents: number
  baseAhorroCents?: number
  minimoPersonalYFamiliarCents: number
  deduccionesCents?: number
  pagosACuentaCents?: number
  escalasGenerales: Array<EscalaIrpf>
  escalasAhorro?: Array<EscalaIrpf>
}

export interface ResultadoCuotaLiquida {
  remanenteMinimoCents: number
  minoracionMinimoGeneralCents: number
  minoracionMinimoAhorroCents: number
  detalleGeneral: Array<ResultadoCuotaEscala>
  detalleAhorro: Array<ResultadoCuotaEscala>
  cuotaIntegraGeneralCents: number
  cuotaIntegraAhorroCents: number
  cuotaIntegraTotalCents: number
  deduccionesAplicadasCents: number
  cuotaLiquidaCents: number
  pagosACuentaAplicadosCents: number
  cuotaDiferenciaCents: number
  avisos: string[]
}

function enteroNoNegativo(valor: number, etiqueta: string): void {
  if (!Number.isInteger(valor)) throw new Error(`${etiqueta} debe ser un entero en céntimos`)
  if (valor < 0) throw new Error(`${etiqueta} no puede ser negativa`)
}

export function calcularCuotaLiquida(entrada: EntradasCuotaLiquida): ResultadoCuotaLiquida {
  const {
    baseGeneralCents,
    baseAhorroCents = 0,
    minimoPersonalYFamiliarCents,
    deduccionesCents = 0,
    pagosACuentaCents = 0,
    escalasGenerales,
    escalasAhorro,
  } = entrada

  enteroNoNegativo(baseGeneralCents, 'La base liquidable general')
  enteroNoNegativo(baseAhorroCents, 'La base liquidable del ahorro')
  enteroNoNegativo(minimoPersonalYFamiliarCents, 'El mínimo personal y familiar')
  enteroNoNegativo(deduccionesCents, 'Las deducciones')
  enteroNoNegativo(pagosACuentaCents, 'Los pagos a cuenta')

  if (!escalasGenerales.length) throw new Error('Se necesita al menos una escala general (estatal+autonómica o foral)')
  if (escalasGenerales.length > 2) throw new Error('Como máximo dos escalas generales (estatal y autonómica)')
  if (escalasGenerales.length === 1 && baseAhorroCents > 0 && !escalasAhorro?.length) {
    throw new Error('Territorio con escala única: indica su escala del ahorro o usa base de ahorro 0')
  }

  const avisos: string[] = []
  const años = new Set(escalasGenerales.map(e => e.taxYear))
  if (años.size > 1) avisos.push(`Escalas generales de años fiscales distintos: ${[...años].join(', ')}`)

  // Art. 63 LIRPF (esquema gráfico AEAT): la cuota íntegra se minora en el mínimo
  // personal y familiar. Se aplica la escala al mínimo imputado a cada base:
  //  - general: cuota = escala(base general) − escala(min(mínimo, base general))
  //  - ahorro: cuota = escala_ahorro(ahorro) − escala_ahorro(min(remanente, ahorro))
  //    donde remanente = máximo(0, mínimo − base general)
  const minimoAplicableGeneral = Math.min(minimoPersonalYFamiliarCents, baseGeneralCents)
  const remanenteMinimo = Math.max(0, minimoPersonalYFamiliarCents - baseGeneralCents)

  const detalleGeneral = escalasGenerales.map(e => calcularCuotaEscala(baseGeneralCents, e))
  const cuotaGeneralSinMinimo = detalleGeneral.reduce((acc, d) => acc + d.cuotaTotalCentimos, 0)
  const minoracionMinimoGeneral = escalasGenerales
    .map(e => calcularCuotaEscala(minimoAplicableGeneral, e))
    .reduce((acc, d) => acc + d.cuotaTotalCentimos, 0)
  const cuotaIntegraGeneral = cuotaGeneralSinMinimo - minoracionMinimoGeneral

  let detalleAhorro: Array<ResultadoCuotaEscala> = []
  let cuotaIntegraAhorro = 0
  let minoracionMinimoAhorro = 0
  const taxYearReferencia = escalasGenerales[0]?.taxYear ?? new Date().getFullYear()
  if (baseAhorroCents > 0 || escalasAhorro?.length) {
    const escalasA = escalasAhorro?.length ? escalasAhorro : escalaAhorroComun(taxYearReferencia)
    detalleAhorro = escalasA.map(e => calcularCuotaEscala(baseAhorroCents, e))
    const cuotaAhorroSinMinimo = detalleAhorro.reduce((acc, d) => acc + d.cuotaTotalCentimos, 0)
    const minimoAplicableAhorro = Math.min(remanenteMinimo, baseAhorroCents)
    minoracionMinimoAhorro = escalasA
      .map(e => calcularCuotaEscala(minimoAplicableAhorro, e))
      .reduce((acc, d) => acc + d.cuotaTotalCentimos, 0)
    cuotaIntegraAhorro = cuotaAhorroSinMinimo - minoracionMinimoAhorro
    if (!escalasAhorro?.length && escalasGenerales.length === 2) {
      avisos.push('Base del ahorro gravada con la escala estatal/autonómica espejo del art. 63 LIRPF.')
    }
  }
  if (remanenteMinimo > 0 && baseAhorroCents > 0) {
    avisos.push(
      `El mínimo absorbe toda la base general; su remanente (${(remanenteMinimo / 100).toFixed(2)} €) minora también la cuota del ahorro.`,
    )
  }

  const cuotaIntegraTotal = cuotaIntegraGeneral + cuotaIntegraAhorro

  const deduccionesAplicadas = Math.min(deduccionesCents, cuotaIntegraTotal)
  if (deduccionesCents > cuotaIntegraTotal) {
    avisos.push('Las deducciones exceden la cuota íntegra; solo se aplican hasta agotarla.')
  }

  const cuotaLiquida = Math.max(0, cuotaIntegraTotal - deduccionesAplicadas)
  const cuotaDiferencia = cuotaLiquida - pagosACuentaCents

  return {
    remanenteMinimoCents: remanenteMinimo,
    minoracionMinimoGeneralCents: minoracionMinimoGeneral,
    minoracionMinimoAhorroCents: minoracionMinimoAhorro,
    detalleGeneral,
    detalleAhorro,
    cuotaIntegraGeneralCents: cuotaIntegraGeneral,
    cuotaIntegraAhorroCents: cuotaIntegraAhorro,
    cuotaIntegraTotalCents: cuotaIntegraTotal,
    deduccionesAplicadasCents: deduccionesAplicadas,
    cuotaLiquidaCents: cuotaLiquida,
    pagosACuentaAplicadosCents: pagosACuentaCents,
    cuotaDiferenciaCents: cuotaDiferencia,
    avisos,
  }
}
