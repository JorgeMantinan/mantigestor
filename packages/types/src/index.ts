export type SubscriptionTier = 'free' | 'basic' | 'pro'

export type Feature =
  | 'ocr_basico'
  | 'ocr_ia'
  | 'chat_documentos'
  | 'examenes_ia'
  | 'asistente_renta'
  | 'exportar_excel'
  | 'exportar_pdf_avanzado'
  | 'gestion_alquiler'
  | 'nominas'
  | 'importar_extracto'
  | 'notificaciones_fiscales'

export const FEATURES_POR_TIER: Record<SubscriptionTier, Feature[]> = {
  free: [
    'exportar_excel'
  ],
  basic: [
    'exportar_excel',
    'exportar_pdf_avanzado',
    'ocr_basico',
    'gestion_alquiler',
    'nominas',
    'importar_extracto',
    'notificaciones_fiscales'
  ],
  pro: [
    'exportar_excel',
    'exportar_pdf_avanzado',
    'ocr_basico',
    'ocr_ia',
    'chat_documentos',
    'examenes_ia',
    'asistente_renta',
    'gestion_alquiler',
    'nominas',
    'importar_extracto',
    'notificaciones_fiscales'
  ]
}

export type TipoFactura = 'ingreso' | 'gasto'

export type CategoriaGasto =
  | 'material_limpieza'
  | 'material_oficina'
  | 'transporte'
  | 'suministros'
  | 'servicios_profesionales'
  | 'alquiler_local'
  | 'nomina_empleada'
  | 'cuota_autonomo'
  | 'otros'

export type CategoriaIngreso =
  | 'servicio_limpieza'
  | 'alquiler_cobrado'
  | 'otros'

export interface Factura {
  id: string
  usuarioId: string
  tipo: TipoFactura
  categoria: CategoriaGasto | CategoriaIngreso | null
  concepto: string
  importe: number
  iva: 0 | 4 | 10 | 21
  importeIva: number
  importeTotal: number
  fecha: Date
  numeroFactura: string | null
  proveedorNombre: string | null
  proveedorNif: string | null
  archivoUrl: string | null
  procesadoPorIa: boolean
  confianzaIa: 'alta' | 'media' | 'baja' | null
  trimestre: 1 | 2 | 3 | 4
  año: number
  deducible: boolean
  creadoEn: Date
  actualizadoEn: Date
}

export interface ResumenTrimestral {
  trimestre: 1 | 2 | 3 | 4
  año: number
  totalIngresos: number
  totalGastos: number
  ivaRepercutido: number
  ivaSoportado: number
  resultadoIva: number
  baseIrpf: number
  pagoIrpf: number
}

export type SituacionLaboral =
  | 'autonomo_puro'
  | 'autonomo_con_nomina'
  | 'asalariado'
  | 'pensionista'
  | 'desempleado'

export interface Perfil {
  id: string
  email: string
  nombre: string | null
  subscriptionTier: SubscriptionTier
  stripeCustomerId: string | null
  paypalEmail: string | null
  situacionLaboral: SituacionLaboral | null
  esAutonomo: boolean
  tieneEmpleadas: boolean
  tieneAlquiler: boolean
  provinciaFiscal: string | null
  creadoEn: Date
}

export interface MovimientoBancario {
  fecha: Date
  concepto: string
  importe: number
  saldo: number
  referencia: string | null
}

export interface Documento {
  id: string
  usuarioId: string
  nombre: string
  archivoUrl: string
  tipoArchivo: string
  tamañoBytes: number | null
  resumen: string | null
  conceptosClave: Array<{ termino: string; definicion: string }> | null
  creadoEn: Date
}

export interface Examen {
  id: string
  documentoId: string
  titulo: string
  preguntas: PreguntaExamen[]
  dificultad: 'facil' | 'media' | 'dificil'
  puntuacion: number | null
  completado: boolean
  creadoEn: Date
}

export interface PreguntaExamen {
  id: number
  tipo: 'test' | 'desarrollo' | 'verdadero_falso'
  pregunta: string
  opciones: string[] | null
  respuestaCorrecta: string | boolean
  explicacion: string
  puntos: number
}
