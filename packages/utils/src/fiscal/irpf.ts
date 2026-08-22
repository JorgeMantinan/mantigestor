export interface TramoIrpf {
  tramo: number
  desdeEur: number
  hastaEur: number | null
  tipoPct: number
}

export interface EscalaIrpf {
  ambito: 'ESTATAL' | 'AUTONOMICO'
  comunidad: string | null
  taxYear: number
  tramos: TramoIrpf[]
}

export interface CuotaTramoIrpf {
  tramo: number
  desdeCentimos: number
  hastaCentimos: number | null
  baseTramoCentimos: number
  tipoPct: number
  cuotaTramoCentimos: number
}

export interface ResultadoCuotaEscala {
  escala: EscalaIrpf
  detalle: CuotaTramoIrpf[]
  cuotaTotalCentimos: number
  tipoMedioPct: number
}

export interface ResultadoIrpf {
  baseLiquidableCentimos: number
  estatal: ResultadoCuotaEscala
  autonomica: ResultadoCuotaEscala
  cuotaIntegraCentimos: number
  avisos: string[]
}

function validarTramos(tramos: TramoIrpf[], etiqueta: string): void {
  if (!Array.isArray(tramos) || tramos.length === 0) {
    throw new Error(`La escala ${etiqueta} no tiene tramos`)
  }
  const ordenados = [...tramos].sort((a, b) => a.desdeEur - b.desdeEur)
  for (let i = 0; i < ordenados.length; i++) {
    const t = ordenados[i]
    if (!t) continue
    if (t.tipoPct < 0 || t.tipoPct > 100) throw new Error(`Tipo inválido en tramo ${t.tramo} de la escala ${etiqueta}`)
    if (t.hastaEur !== null && t.hastaEur <= t.desdeEur) throw new Error(`Límites incoherentes en tramo ${t.tramo} de la escala ${etiqueta}`)
    const anterior = ordenados[i - 1]
    if (anterior && anterior.hastaEur !== null && Math.abs(anterior.hastaEur - t.desdeEur) > 0.005) {
      throw new Error(`Los tramos de la escala ${etiqueta} no son contiguos entre ${anterior.hastaEur} y ${t.desdeEur}`)
    }
  }
}

export function calcularCuotaEscala(
  baseLiquidableEnCentimos: number,
  escala: EscalaIrpf,
): ResultadoCuotaEscala {
  if (!Number.isInteger(baseLiquidableEnCentimos)) throw new Error('La base liquidable debe ser un entero en céntimos')
  if (baseLiquidableEnCentimos < 0) throw new Error('La base liquidable no puede ser negativa')
  validarTramos(escala.tramos, escala.ambito)

  const baseEur = baseLiquidableEnCentimos / 100
  const detalle: CuotaTramoIrpf[] = []
  let cuotaTotalCentimos = 0

  for (const t of [...escala.tramos].sort((a, b) => a.desdeEur - b.desdeEur)) {
    if (baseEur <= t.desdeEur) break
    const limiteSuperior = t.hastaEur === null ? baseEur : Math.min(t.hastaEur, baseEur)
    const baseTramoEur = limiteSuperior - t.desdeEur
    const cuotaTramoCentimos = Math.round(baseTramoEur * 100 * (t.tipoPct / 100))
    detalle.push({
      tramo: t.tramo,
      desdeCentimos: Math.round(t.desdeEur * 100),
      hastaCentimos: t.hastaEur === null ? null : Math.round(t.hastaEur * 100),
      baseTramoCentimos: Math.round(baseTramoEur * 100),
      tipoPct: t.tipoPct,
      cuotaTramoCentimos,
    })
    cuotaTotalCentimos += cuotaTramoCentimos
  }

  const tipoMedioPct = baseLiquidableEnCentimos === 0
    ? 0
    : Number(((cuotaTotalCentimos / baseLiquidableEnCentimos) * 100).toFixed(2))

  return { escala, detalle, cuotaTotalCentimos, tipoMedioPct }
}

export function calcularIrpf(
  baseLiquidableEnCentimos: number,
  escalaEstatal: EscalaIrpf,
  escalaAutonomica: EscalaIrpf,
): ResultadoIrpf {
  const avisos: string[] = []
  if (escalaEstatal.taxYear !== escalaAutonomica.taxYear) {
    avisos.push(`Años fiscales distintos: estatal ${escalaEstatal.taxYear}, autonómico ${escalaAutonomica.taxYear}`)
  }

  const estatal = calcularCuotaEscala(baseLiquidableEnCentimos, escalaEstatal)
  const autonomica = calcularCuotaEscala(baseLiquidableEnCentimos, escalaAutonomica)

  return {
    baseLiquidableCentimos: baseLiquidableEnCentimos,
    estatal,
    autonomica,
    cuotaIntegraCentimos: estatal.cuotaTotalCentimos + autonomica.cuotaTotalCentimos,
    avisos,
  }
}
