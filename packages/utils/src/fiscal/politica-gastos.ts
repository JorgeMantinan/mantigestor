export interface ReglaGasto {
  id: string
  nombre: string
  descripcion: string
  umbral?: number // en céntimos
  camposRequeridos?: string[]
}

export const REGLAS_GASTO: ReglaGasto[] = [
  {
    id: 'umbral-1000',
    nombre: 'Gasto alto',
    descripcion: 'Gastos superiores a 1.000 € requieren revisión',
    umbral: 100_000,
  },
  {
    id: 'umbral-5000',
    nombre: 'Gasto muy alto',
    descripcion: 'Gastos superiores a 5.000 € requieren aprobación',
    umbral: 500_000,
  },
  {
    id: 'nif-requerido',
    nombre: 'NIF obligatorio',
    descripcion: 'Facturas de gasto deberían incluir NIF/CIF',
    camposRequeridos: ['nifContraparte'],
  },
]

export interface Incumplimiento {
  reglaId: string
  reglaNombre: string
  descripcion: string
  facturaId: string
  facturaNumero: string
  gravedad: 'info' | 'warning' | 'error'
}

export function verificarPoliticaGasto(
  factura: {
    id: string
    numero: string
    tipo: string
    total: number
    nifContraparte: string | null
  },
  reglas: ReglaGasto[] = REGLAS_GASTO
): Incumplimiento[] {
  if (factura.tipo !== 'gasto') return []
  const incumplimientos: Incumplimiento[] = []

  for (const regla of reglas) {
    if (regla.umbral && factura.total > regla.umbral) {
      incumplimientos.push({
        reglaId: regla.id,
        reglaNombre: regla.nombre,
        descripcion: regla.descripcion,
        facturaId: factura.id,
        facturaNumero: factura.numero,
        gravedad: factura.total > (regla.umbral * 5) ? 'error' : 'warning',
      })
    }
    if (regla.camposRequeridos) {
      for (const campo of regla.camposRequeridos) {
        if (campo === 'nifContraparte' && !factura.nifContraparte) {
          incumplimientos.push({
            reglaId: regla.id,
            reglaNombre: regla.nombre,
            descripcion: regla.descripcion,
            facturaId: factura.id,
            facturaNumero: factura.numero,
            gravedad: 'info',
          })
        }
      }
    }
  }

  return incumplimientos
}
