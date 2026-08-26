import type { SubscriptionTier } from '@mantigestor/types'

export interface FechaFiscal {
  modelo: string
  descripcion: string
  fechaLimite: Date
  diasAviso: number[]
  tiersQueAplica: SubscriptionTier[]
  url: string
  /** Categoría para agrupación visual */
  categoria: 'iva' | 'irpf' | 'retenciones' | 'renta' | 'otros'
}

export function getCalendarioFiscal(año: number): FechaFiscal[] {
  return [
    // ── IVA trimestral (Modelo 303) ──
    {
      modelo: '303-Q1',
      descripcion: 'IVA 1er trimestre (enero-marzo)',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html',
      categoria: 'iva',
    },
    {
      modelo: '303-Q2',
      descripcion: 'IVA 2º trimestre (abril-junio)',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html',
      categoria: 'iva',
    },
    {
      modelo: '303-Q3',
      descripcion: 'IVA 3er trimestre (julio-septiembre)',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html',
      categoria: 'iva',
    },
    {
      modelo: '303-Q4',
      descripcion: 'IVA 4º trimestre (octubre-diciembre)',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303.html',
      categoria: 'iva',
    },

    // ── IRPF trimestral autónomos (Modelo 130) ──
    {
      modelo: '130-Q1',
      descripcion: 'IRPF autónomos 1er trimestre (enero-marzo)',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-130.html',
      categoria: 'irpf',
    },
    {
      modelo: '130-Q2',
      descripcion: 'IRPF autónomos 2º trimestre (abril-junio)',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-130.html',
      categoria: 'irpf',
    },
    {
      modelo: '130-Q3',
      descripcion: 'IRPF autónomos 3er trimestre (julio-septiembre)',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-130.html',
      categoria: 'irpf',
    },
    {
      modelo: '130-Q4',
      descripcion: 'IRPF autónomos 4º trimestre (octubre-diciembre)',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-130.html',
      categoria: 'irpf',
    },

    // ── Retenciones trimestrales (Modelo 111) ──
    {
      modelo: '111-Q1',
      descripcion: 'Retenciones IRPF 1er trimestre (pagos a trabajadores/profesionales)',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-111.html',
      categoria: 'retenciones',
    },
    {
      modelo: '111-Q2',
      descripcion: 'Retenciones IRPF 2º trimestre',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-111.html',
      categoria: 'retenciones',
    },
    {
      modelo: '111-Q3',
      descripcion: 'Retenciones IRPF 3er trimestre',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-111.html',
      categoria: 'retenciones',
    },
    {
      modelo: '111-Q4',
      descripcion: 'Retenciones IRPF 4º trimestre',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-111.html',
      categoria: 'retenciones',
    },

    // ── Retenciones alquiler (Modelo 115) ──
    {
      modelo: '115-Q1',
      descripcion: 'Retenciones arrendamientos 1er trimestre (locales negocio)',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-115.html',
      categoria: 'retenciones',
    },
    {
      modelo: '115-Q2',
      descripcion: 'Retenciones arrendamientos 2º trimestre',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-115.html',
      categoria: 'retenciones',
    },
    {
      modelo: '115-Q3',
      descripcion: 'Retenciones arrendamientos 3er trimestre',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-115.html',
      categoria: 'retenciones',
    },
    {
      modelo: '115-Q4',
      descripcion: 'Retenciones arrendamientos 4º trimestre',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-115.html',
      categoria: 'retenciones',
    },

    // ── Declaraciones anuales ──
    {
      modelo: 'RENTA',
      descripcion: 'Declaración de la Renta (IRPF anual)',
      fechaLimite: new Date(`${año}-06-30`),
      diasAviso: [30, 15, 7, 1],
      tiersQueAplica: ['free', 'basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta.html',
      categoria: 'renta',
    },
    {
      modelo: 'PATRIMONIO',
      descripcion: 'Declaración del Impuesto sobre el Patrimonio',
      fechaLimite: new Date(`${año}-06-30`),
      diasAviso: [30, 15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/impuesto-patrimonio.html',
      categoria: 'irpf',
    },
    {
      modelo: '390',
      descripcion: 'Resumen anual IVA (Modelo 390)',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-390.html',
      categoria: 'iva',
    },
    {
      modelo: '190',
      descripcion: 'Resumen anual retenciones trabajo (Modelo 190)',
      fechaLimite: new Date(`${año + 1}-01-31`),
      diasAviso: [15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-190.html',
      categoria: 'retenciones',
    },
    {
      modelo: '180',
      descripcion: 'Resumen anual retenciones arrendamientos (Modelo 180)',
      fechaLimite: new Date(`${año + 1}-01-31`),
      diasAviso: [15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-180.html',
      categoria: 'retenciones',
    },

    // ── Otros modelos ──
    {
      modelo: '720',
      descripcion: 'Declaración informativa bienes en el extranjero (>50.000 €)',
      fechaLimite: new Date(`${año + 1}-03-31`),
      diasAviso: [30, 15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-720.html',
      categoria: 'otros',
    },
    {
      modelo: 'CENSO',
      descripcion: 'Declaración censal anual (Modelo 036/037) — alta/baja/variationes',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/empresas/censos-impuestos/036-037.html',
      categoria: 'otros',
    },
    {
      modelo: 'SOCIEDADES',
      descripcion: 'Impuesto Sociedades (Modelo 200) — entidades jurídicas',
      fechaLimite: new Date(`${año + 1}-07-25`),
      diasAviso: [30, 15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/sociedades/impuesto-sociedades-200.html',
      categoria: 'irpf',
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
