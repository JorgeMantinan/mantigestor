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

    // ── Modelo 100 — IRPF anual ──
    {
      modelo: '100',
      descripcion: 'Declaración del IRPF anual (Modelo 100)',
      fechaLimite: new Date(`${año}-06-30`),
      diasAviso: [30, 15, 7, 1],
      tiersQueAplica: ['free', 'basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-100.html',
      categoria: 'irpf',
    },

    // ── Modelo 131 — IRPF módulos trimestral ──
    {
      modelo: '131-Q1',
      descripcion: 'IRPF módulos 1er trimestre (enero-marzo)',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-131.html',
      categoria: 'irpf',
    },
    {
      modelo: '131-Q2',
      descripcion: 'IRPF módulos 2º trimestre (abril-junio)',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-131.html',
      categoria: 'irpf',
    },
    {
      modelo: '131-Q3',
      descripcion: 'IRPF módulos 3er trimestre (julio-septiembre)',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-131.html',
      categoria: 'irpf',
    },
    {
      modelo: '131-Q4',
      descripcion: 'IRPF módulos 4º trimestre (octubre-diciembre)',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-131.html',
      categoria: 'irpf',
    },

    // ── Modelo 123 — Retenciones capital mobiliario trimestral ──
    {
      modelo: '123-Q1',
      descripcion: 'Retenciones capital mobiliario 1er trimestre',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-123.html',
      categoria: 'retenciones',
    },
    {
      modelo: '123-Q2',
      descripcion: 'Retenciones capital mobiliario 2º trimestre',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-123.html',
      categoria: 'retenciones',
    },
    {
      modelo: '123-Q3',
      descripcion: 'Retenciones capital mobiliario 3er trimestre',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-123.html',
      categoria: 'retenciones',
    },
    {
      modelo: '123-Q4',
      descripcion: 'Retenciones capital mobiliario 4º trimestre',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-pro/pagos-mensuales/modelo-123.html',
      categoria: 'retenciones',
    },

    // ── Modelo 347 — Operaciones con terceros ──
    {
      modelo: '347',
      descripcion: 'Declaración informativa operaciones con terceros (>3.005,06 €)',
      fechaLimite: new Date(`${año + 1}-02-28`),
      diasAviso: [30, 15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-347.html',
      categoria: 'otros',
    },

    // ── Modelo 349 — Intracomunitarias ──
    {
      modelo: '349',
      descripcion: 'Declaración informativa operaciones intracomunitarias',
      fechaLimite: new Date(`${año + 1}-01-20`),
      diasAviso: [15, 7],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-349.html',
      categoria: 'iva',
    },

    // ── Modelo 721 — Monedas virtuales extranjero ──
    {
      modelo: '721',
      descripcion: 'Declaración informativa monedas virtuales en el extranjero',
      fechaLimite: new Date(`${año + 1}-03-31`),
      diasAviso: [30, 15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-721.html',
      categoria: 'otros',
    },

    // ── Modelo 714 — Impuesto sobre el Patrimonio ──
    {
      modelo: '714',
      descripcion: 'Impuesto sobre el Patrimonio (Modelo 714)',
      fechaLimite: new Date(`${año}-06-30`),
      diasAviso: [30, 15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/impuesto-patrimonio.html',
      categoria: 'irpf',
    },

    // ── Modelo 232 — Operaciones vinculadas ──
    {
      modelo: '232',
      descripcion: 'Declaración informativa operaciones vinculadas',
      fechaLimite: new Date(`${año + 1}-11-28`),
      diasAviso: [30, 15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/sociedades/modelo-232.html',
      categoria: 'irpf',
    },

    // ── Modelo 210 — IRNR no residentes trimestral ──
    {
      modelo: '210-Q1',
      descripcion: 'IRNR no residentes 1er trimestre',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-210.html',
      categoria: 'retenciones',
    },
    {
      modelo: '210-Q2',
      descripcion: 'IRNR no residentes 2º trimestre',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-210.html',
      categoria: 'retenciones',
    },
    {
      modelo: '210-Q3',
      descripcion: 'IRNR no residentes 3er trimestre',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-210.html',
      categoria: 'retenciones',
    },
    {
      modelo: '210-Q4',
      descripcion: 'IRNR no residentes 4º trimestre',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-210.html',
      categoria: 'retenciones',
    },

    // ── Modelo 220 — IS consolidación fiscal ──
    {
      modelo: '220',
      descripcion: 'Impuesto Sociedades consolidación fiscal (Modelo 220)',
      fechaLimite: new Date(`${año + 1}-07-25`),
      diasAviso: [30, 15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/sociedades/modelo-220.html',
      categoria: 'irpf',
    },

    // ── Modelo 309 — IVA simplificado trimestral ──
    {
      modelo: '309-Q1',
      descripcion: 'IVA simplificado 1er trimestre',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-309.html',
      categoria: 'iva',
    },
    {
      modelo: '309-Q2',
      descripcion: 'IVA simplificado 2º trimestre',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-309.html',
      categoria: 'iva',
    },
    {
      modelo: '309-Q3',
      descripcion: 'IVA simplificado 3er trimestre',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-309.html',
      categoria: 'iva',
    },
    {
      modelo: '309-Q4',
      descripcion: 'IVA simplificado 4º trimestre',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-309.html',
      categoria: 'iva',
    },

    // ── Modelo 184 — Atribución rentas ──
    {
      modelo: '184',
      descripcion: 'Declaración informativa atribución rentas (entidades en atribución)',
      fechaLimite: new Date(`${año + 1}-01-31`),
      diasAviso: [15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-184.html',
      categoria: 'otros',
    },

    // ── Modelo 296 — Retenciones NR resumen anual ──
    {
      modelo: '296',
      descripcion: 'Resumen anual retenciones no residentes (Modelo 296)',
      fechaLimite: new Date(`${año + 1}-01-31`),
      diasAviso: [15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-296.html',
      categoria: 'retenciones',
    },

    // ── Modelo 345 — Planes de pensiones informativo ──
    {
      modelo: '345',
      descripcion: 'Información planes de pensiones y previsión social',
      fechaLimite: new Date(`${año + 1}-01-31`),
      diasAviso: [15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-345.html',
      categoria: 'otros',
    },

    // ── Modelo 193 — Retenciones seguros ──
    {
      modelo: '193',
      descripcion: 'Retenciones operaciones de seguros (Modelo 193)',
      fechaLimite: new Date(`${año + 1}-01-31`),
      diasAviso: [15, 7],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-193.html',
      categoria: 'retenciones',
    },

    // ── Modelo 369 — IVA OSS trimestral ──
    {
      modelo: '369-Q1',
      descripcion: 'IVA OSS 1er trimestre (régimen un solo estado)',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-369.html',
      categoria: 'iva',
    },
    {
      modelo: '369-Q2',
      descripcion: 'IVA OSS 2º trimestre',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-369.html',
      categoria: 'iva',
    },
    {
      modelo: '369-Q3',
      descripcion: 'IVA OSS 3er trimestre',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-369.html',
      categoria: 'iva',
    },
    {
      modelo: '369-Q4',
      descripcion: 'IVA OSS 4º trimestre',
      fechaLimite: new Date(`${año + 1}-01-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-369.html',
      categoria: 'iva',
    },

    // ── Modelo 202 — Pagos fraccionados IS ──
    {
      modelo: '202-Q1',
      descripcion: 'Pagos fraccionados IS 1er trimestre',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/sociedades/modelo-202.html',
      categoria: 'irpf',
    },
    {
      modelo: '202-Q2',
      descripcion: 'Pagos fraccionados IS 2º trimestre',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/sociedades/modelo-202.html',
      categoria: 'irpf',
    },
    {
      modelo: '202-Q3',
      descripcion: 'Pagos fraccionados IS 3er trimestre',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/sociedades/modelo-202.html',
      categoria: 'irpf',
    },

    // ── Modelo 151 — IRPF módulos alta/renuncia trimestral ──
    {
      modelo: '151-Q1',
      descripcion: 'IRPF módulos alta/renuncia 1er trimestre',
      fechaLimite: new Date(`${año}-04-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-131.html',
      categoria: 'irpf',
    },
    {
      modelo: '151-Q2',
      descripcion: 'IRPF módulos alta/renuncia 2º trimestre',
      fechaLimite: new Date(`${año}-07-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-131.html',
      categoria: 'irpf',
    },
    {
      modelo: '151-Q3',
      descripcion: 'IRPF módulos alta/renuncia 3er trimestre',
      fechaLimite: new Date(`${año}-10-20`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-131.html',
      categoria: 'irpf',
    },
    {
      modelo: '151-Q4',
      descripcion: 'IRPF módulos alta/renuncia 4º trimestre',
      fechaLimite: new Date(`${año + 1}-01-30`),
      diasAviso: [15, 7, 1],
      tiersQueAplica: ['basic', 'pro'],
      url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/empresarios-profesionales-agricultores/pagos-fraccionados/modelo-131.html',
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
