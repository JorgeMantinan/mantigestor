export interface PlazoFiscalEntrada {
  id?: string
  modeloNumero: string | null
  periodo: string
  fechaLimiteReferencia: Date | null
  status?: string
}

export interface PlazoFiscalConDias extends PlazoFiscalEntrada {
  diasRestantes: number
}

const MS_DIA = 24 * 60 * 60 * 1000

export function proximosPlazos(
  plazos: PlazoFiscalEntrada[],
  hoy: Date,
  limite = 10,
): PlazoFiscalConDias[] {
  const inicioHoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())

  return plazos
    .filter(p => p.fechaLimiteReferencia instanceof Date && !Number.isNaN(p.fechaLimiteReferencia.getTime()))
    .map(p => ({
      ...p,
      diasRestantes: Math.round((p.fechaLimiteReferencia!.getTime() - inicioHoyUtc) / MS_DIA),
    }))
    .filter(p => p.diasRestantes >= 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, limite)
}
