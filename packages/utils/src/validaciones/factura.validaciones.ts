import { z } from 'zod'

// Refleja los campos escribibles de `model Factura` (schema.prisma).
// Nota: fechaVencimiento se mantiene como string (opcional) por compatibilidad
// con la UI; rectificativas con base negativa no pasan por esta vía de API.
export const FacturaSchema = z.object({
  tipo: z.enum(['ingreso', 'gasto', 'proforma']),
  numero: z.string().min(1, 'El número de factura es requerido').max(50),
  emisorReceptor: z.string().min(1, 'El nombre de la contraparte es requerido').max(200),
  nifContraparte: z
    .string()
    .regex(/^[A-Za-z0-9]{9}$/, 'NIF/CIF no válido (9 caracteres alfanuméricos)')
    .nullable()
    .optional(),
  fechaEmision: z.coerce
    .date()
    .max(new Date(), 'La fecha no puede ser futura')
    .min(new Date('2000-01-01'), 'Fecha demasiado antigua'),
  fechaVencimiento: z.string().optional().nullable(),
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
  empresaId: z.string().max(64).nullable().optional(),
  descuentoPorcentaje: z.number().min(0).max(100).optional(),
  categoriaGasto: z.string().max(50).optional().nullable(),
  notas: z.string().max(5000).optional().nullable(),
  notasPrivadas: z.string().max(5000).optional().nullable(),
  deducible: z.boolean().optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
  pdfUrl: z.string().max(2048).optional().nullable(),
  tokenCliente: z.string().max(128).optional().nullable(),
  moneda: z.string().length(3).optional(),
  tipoCambio: z.number().min(0).max(1000).optional(),
  pagosParciales: z.string().max(20000).optional().nullable(),
})

export type FacturaInput = z.infer<typeof FacturaSchema>
