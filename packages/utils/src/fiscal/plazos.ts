export interface PlazoFiscalEntrada {
  id?: string
  modeloNumero: string | null
  periodo: string
  /** Puede llegar como string ISO cuando atraviesa JSON (API); se normaliza al calcular */
  fechaLimiteReferencia: Date | string | null
  status?: string
}

export interface PlazoFiscalConDias extends Omit<PlazoFiscalEntrada, 'fechaLimiteReferencia'> {
  fechaLimiteReferencia: Date
  diasRestantes: number
}

const MS_DIA = 24 * 60 * 60 * 1000

function aFechaSegura(valor: Date | string | null): Date | null {
  if (valor === null || valor === undefined || valor === '') return null
  const d = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

export function proximosPlazos(
  plazos: PlazoFiscalEntrada[],
  hoy: Date,
  limite = 10,
): PlazoFiscalConDias[] {
  const inicioHoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())

  return plazos
    .map(p => ({ ...p, fechaLimiteReferencia: aFechaSegura(p.fechaLimiteReferencia) }))
    .filter((p): p is typeof p & { fechaLimiteReferencia: Date } => p.fechaLimiteReferencia !== null)
    .map(p => ({
      ...p,
      diasRestantes: Math.round((p.fechaLimiteReferencia.getTime() - inicioHoyUtc) / MS_DIA),
    }))
    .filter(p => p.diasRestantes >= 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, limite)
}
