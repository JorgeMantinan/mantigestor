import { z } from 'zod'

export const PerfilSchema = z.object({
  nombre: z.string().min(2).max(100).nullable(),
  esAutonomo: z.boolean(),
  tieneEmpleadas: z.boolean(),
  tieneAlquiler: z.boolean(),
  provinciaFiscal: z.string().nullable(),
  situacionLaboral: z.enum([
    'autonomo_puro',
    'autonomo_con_nomina',
    'asalariado',
    'pensionista',
    'desempleado'
  ]).nullable(),
  notificacionesEmail: z.boolean(),
  notificacionesPush: z.boolean(),
})

export type PerfilInput = z.infer<typeof PerfilSchema>

export const LoginSchema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type LoginInput = z.infer<typeof LoginSchema>

export const RegisterSchema = z.object({
  email: z.string().email('Email no válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export type RegisterInput = z.infer<typeof RegisterSchema>
