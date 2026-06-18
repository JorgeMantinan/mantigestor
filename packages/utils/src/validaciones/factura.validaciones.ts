import { z } from 'zod'

export const FacturaSchema = z.object({
  tipo: z.enum(['ingreso', 'gasto']),
  categoria: z.string().nullable(),
  concepto: z
    .string()
    .min(3, 'El concepto debe tener al menos 3 caracteres')
    .max(200, 'Máximo 200 caracteres'),
  importe: z
    .number()
    .int('El importe debe ser un número entero en céntimos')
    .positive('El importe debe ser positivo')
    .max(999999999, 'Importe demasiado grande'),
  iva: z.union([
    z.literal(0),
    z.literal(4),
    z.literal(10),
    z.literal(21)
  ], { errorMap: () => ({ message: 'IVA debe ser 0, 4, 10 o 21' }) }),
  fecha: z.coerce
    .date()
    .max(new Date(), 'La fecha no puede ser futura')
    .min(new Date('2000-01-01'), 'Fecha demasiado antigua'),
  numeroFactura: z.string().max(50).nullable().optional(),
  proveedorNombre: z.string().max(200).nullable().optional(),
  proveedorNif: z
    .string()
    .regex(/^[A-Z0-9]{9}$/, 'NIF/CIF no válido')
    .nullable()
    .optional(),
  archivoUrl: z.string().url().nullable().optional(),
  deducible: z.boolean().default(true),
})

export type FacturaInput = z.infer<typeof FacturaSchema>
