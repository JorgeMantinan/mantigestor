import { z } from 'zod'

export const FacturaSchema = z.object({
  tipo: z.enum(['ingreso', 'gasto']),
  numero: z.string().min(1, 'El número de factura es requerido').max(50),
  emisorReceptor: z.string().min(1, 'El nombre de la contraparte es requerido').max(200),
  nifContraparte: z
    .string()
    .regex(/^[A-Z0-9]{9}$/, 'NIF/CIF no válido (9 caracteres alfanuméricos)')
    .nullable()
    .optional(),
  fechaEmision: z.coerce
    .date()
    .max(new Date(), 'La fecha no puede ser futura')
    .min(new Date('2000-01-01'), 'Fecha demasiado antigua'),
  baseImponible: z
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
  total: z.number().int(),
  estado: z.enum(['pendiente', 'pagada', 'vencida', 'cancelada']).default('pendiente'),
})

export type FacturaInput = z.infer<typeof FacturaSchema>
