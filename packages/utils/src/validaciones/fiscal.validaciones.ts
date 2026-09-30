import { z } from 'zod'

export const ConsultaIrpfSchema = z.object({
  comunidad: z.string().min(2, 'Indica una comunidad autónoma').max(80),
  baseLiquidableEur: z
    .number({ invalid_type_error: 'La base liquidable debe ser un número' })
    .nonnegative('La base liquidable no puede ser negativa')
    .max(1_000_000_000, 'Importe fuera de rango'),
  taxYear: z.number().int().min(2020).max(2030).optional().default(2025),
})

export type ConsultaIrpfInput = z.infer<typeof ConsultaIrpfSchema>

export const ConsultaRetaSchema = z.object({
  rendimientoNetoMensualEur: z
    .number({ invalid_type_error: 'El rendimiento neto debe ser un número' })
    .nonnegative('El rendimiento neto no puede ser negativo')
    .max(1_000_000, 'Importe fuera de rango'),
  taxYear: z.number().int().min(2024).max(2030).optional().default(2026),
})

export type ConsultaRetaInput = z.infer<typeof ConsultaRetaSchema>

/** Periodo para generar/listar modelos fiscales almacenados (303, 111, 130) */
export const ModelosPeriodoSchema = z.object({
  anyo: z
    .number({ invalid_type_error: 'El año debe ser un número' })
    .int('El año debe ser un número entero')
    .min(2020, 'Año demasiado antiguo')
    .max(2035, 'Año fuera de rango'),
  trimestre: z
    .number({ invalid_type_error: 'El trimestre debe ser un número' })
    .int('El trimestre debe ser un número entero')
    .min(1, 'El trimestre debe estar entre 1 y 4')
    .max(4, 'El trimestre debe estar entre 1 y 4'),
})

export type ModelosPeriodoInput = z.infer<typeof ModelosPeriodoSchema>
