import type { SubscriptionTier } from '@mantigestor/types'

export interface FechaFiscal {
  modelo: string
  descripcion: string
  fechaLimite: Date
  diasAviso: number[]
  tiersQueAplica: SubscriptionTier[]
  url: string
}

export function getCalendarioFiscal(año: number): FechaFiscal[] {
  return [
    {
      modelo: '303-Q1',
      descripcion: 'IVA 1er trimestre (enero-marzo)',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html'
    },
    {
      modelo: '303-Q2',
      descripcion: 'IVA 2º trimestre (abril-junio)',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html'
    },
    {
      modelo: '303-Q3',
      descripcion: 'IVA 3er trimestre (julio-septiembre)',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html'
    },
    {
      modelo: '303-Q4',
      descripcion: 'IVA 4º trimestre (octubre-diciembre)',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html'
    },
    {
      modelo: '130-Q1',
      descripcion: 'IRPF 1er trimestre (enero-marzo)',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-130.html'
    },
    {
      modelo: '130-Q2',
      descripcion: 'IRPF 2º trimestre (abril-junio)',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-130.html'
    },
    {
      modelo: '130-Q3',
      descripcion: 'IRPF 3er trimestre (julio-septiembre)',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-130.html'
    },
    {
      modelo: '130-Q4',
      descripcion: 'IRPF 4º trimestre (octubre-diciembre)',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-130.html'
    },
    {
      modelo: 'RENTA',
      descripcion: 'Declaración de la Renta (IRPF anual)',
      fechaLimite: new Date(`${año}-06-30`),
      diasAviso: [30, 15, 7, 1],
      tiersQueAplica: ['free', 'basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta.html'
    },
    {
      modelo: '390',
      descripcion: 'Resumen anual IVA (Modelo 390)',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-390.html'
    },
    {
      modelo: '190',
      descripcion: 'Resumen anual retenciones trabajo (Modelo 190)',
      fechaLimite: new Date(`${año + 1}-01-31`),
      diasAviso: [15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-190.html'
    },
  ]
}

export function getFechasProximas(
  año: number,
  diasHastaVencimiento: number = 30
): FechaFiscal[] {
  const hoy = new Date()
  const limite = new Date()
  limite.setDate(limite.getDate() + diasHastaVencimiento)

  return getCalendarioFiscal(año)
    .filter(f => f.fechaLimite >= hoy && f.fechaLimite <= limite)
    .sort((a, b) => a.fechaLimite.getTime() - b.fechaLimite.getTime())
}
