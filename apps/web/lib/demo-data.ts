export const DEMO_EMAIL = 'demo@mantigestor.local'
// La contraseña ya no está en el repo: /api/demo/crear genera una aleatoria
// en cada creación y la devuelve solo a quien la ha solicitado.
export const DEMO_NIF = '12345678Z'

export interface DemoPerfil {
  email: string
  nombre: string
  nif: string
  actividad: string
}

export const DEMO_PERFIL: DemoPerfil = {
  email: DEMO_EMAIL,
  nombre: 'Lucía Fernández',
  nif: DEMO_NIF,
  actividad: 'Diseño gráfico',
}

export interface DemoFactura {
  numero: string
  tipo: 'ingreso' | 'gasto'
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  fechaVencimiento: string | null
  baseImponible: number
  iva: number
  estado: string
  categoriaGasto: string | null
}

export const DEMO_FACTURAS_EMITIDAS: DemoFactura[] = [
  { numero: 'F-2026-001', tipo: 'ingreso', emisorReceptor: 'Studio Nord S.L.', nifContraparte: 'B-12345678', fechaEmision: '2026-01-15', fechaVencimiento: '2026-02-15', baseImponible: 120000, iva: 21, estado: 'pagada', categoriaGasto: null },
  { numero: 'F-2026-002', tipo: 'ingreso', emisorReceptor: 'Café El Rincón', nifContraparte: 'B-87654321', fechaEmision: '2026-02-03', fechaVencimiento: '2026-03-03', baseImponible: 80000, iva: 10, estado: 'pagada', categoriaGasto: null },
  { numero: 'F-2026-003', tipo: 'ingreso', emisorReceptor: 'Digital Marketing Pro', nifContraparte: 'B-23456789', fechaEmision: '2026-03-20', fechaVencimiento: '2026-04-20', baseImponible: 240000, iva: 21, estado: 'pagada', categoriaGasto: null },
  { numero: 'F-2026-004', tipo: 'ingreso', emisorReceptor: 'Editorial La Pluma', nifContraparte: 'B-34567890', fechaEmision: '2026-04-10', fechaVencimiento: '2026-05-10', baseImponible: 95000, iva: 21, estado: 'pagada', categoriaGasto: null },
  { numero: 'F-2026-005', tipo: 'ingreso', emisorReceptor: 'Arquitectura Vanguardia', nifContraparte: 'B-45678901', fechaEmision: '2026-05-05', fechaVencimiento: '2026-06-05', baseImponible: 180000, iva: 21, estado: 'pagada', categoriaGasto: null },
  { numero: 'F-2026-006', tipo: 'ingreso', emisorReceptor: 'Hotel Mirador', nifContraparte: 'B-56789012', fechaEmision: '2026-06-15', fechaVencimiento: '2026-07-15', baseImponible: 60000, iva: 10, estado: 'pendiente', categoriaGasto: null },
  { numero: 'F-2026-007', tipo: 'ingreso', emisorReceptor: 'Startup Ecotech', nifContraparte: 'B-67890123', fechaEmision: '2026-07-01', fechaVencimiento: '2026-08-01', baseImponible: 320000, iva: 21, estado: 'pagada', categoriaGasto: null },
  { numero: 'F-2026-008', tipo: 'ingreso', emisorReceptor: 'Asociación Cultural Ágora', nifContraparte: 'G-78901234', fechaEmision: '2026-08-12', fechaVencimiento: '2026-09-12', baseImponible: 45000, iva: 10, estado: 'pendiente', categoriaGasto: null },
  { numero: 'F-2026-009', tipo: 'ingreso', emisorReceptor: 'Consultora Nexia', nifContraparte: 'B-89012345', fechaEmision: '2026-09-08', fechaVencimiento: '2026-10-08', baseImponible: 150000, iva: 21, estado: 'pendiente', categoriaGasto: null },
  { numero: 'F-2026-010', tipo: 'ingreso', emisorReceptor: 'Tienda El Almacén', nifContraparte: 'B-90123456', fechaEmision: '2026-09-22', fechaVencimiento: '2026-10-22', baseImponible: 70000, iva: 21, estado: 'pendiente', categoriaGasto: null },
]

export const DEMO_FACTURAS_RECIBIDAS: DemoFactura[] = [
  { numero: 'G-2026-001', tipo: 'gasto', emisorReceptor: 'Inmobiliaria Centro', nifContraparte: 'B-11111111', fechaEmision: '2026-09-01', fechaVencimiento: null, baseImponible: 75000, iva: 21, estado: 'pagada', categoriaGasto: 'alquiler' },
  { numero: 'G-2026-002', tipo: 'gasto', emisorReceptor: 'Papelería Goya', nifContraparte: 'B-22222222', fechaEmision: '2026-08-20', fechaVencimiento: null, baseImponible: 12000, iva: 21, estado: 'pagada', categoriaGasto: 'suministros' },
  { numero: 'G-2026-003', tipo: 'gasto', emisorReceptor: 'Escuela Creativa Online', nifContraparte: 'B-33333333', fechaEmision: '2026-07-10', fechaVencimiento: null, baseImponible: 30000, iva: 21, estado: 'pagada', categoriaGasto: 'formacion' },
  { numero: 'G-2026-004', tipo: 'gasto', emisorReceptor: 'Operadora Telecom', nifContraparte: 'A-44444444', fechaEmision: '2026-09-05', fechaVencimiento: null, baseImponible: 4000, iva: 21, estado: 'pagada', categoriaGasto: 'suministros' },
  { numero: 'G-2026-005', tipo: 'gasto', emisorReceptor: 'Seguros Mirallaje', nifContraparte: 'A-55555555', fechaEmision: '2026-05-28', fechaVencimiento: null, baseImponible: 22000, iva: 21, estado: 'pagada', categoriaGasto: 'seguros' },
]

export interface DemoPropiedad {
  direccion: string
  ingresos: number
  inquilinoNombre: string
  inquilinoNif: string
  fechaInicioContrato: string
}

export const DEMO_PROPIEDADES: DemoPropiedad[] = [
  { direccion: 'Calle Mayor 12, 2ºA, Madrid', ingresos: 85000, inquilinoNombre: 'María López', inquilinoNif: '98765432X', fechaInicioContrato: '2024-03-01' },
  { direccion: 'Calle Sol 5, Bajo, Madrid', ingresos: 120000, inquilinoNombre: 'Pérez Comercial S.L.', inquilinoNif: 'B-65432198', fechaInicioContrato: '2025-01-15' },
]

export interface DemoNomina {
  empleada: string
  mes: number
  anyo: number
  salarioBruto: number
  irpf: number
  seguridadSocial: number
  rol: string
}

export const DEMO_NOMINAS: DemoNomina[] = [
  { empleada: 'Elena García', mes: 9, anyo: 2026, salarioBruto: 150000, irpf: 15, seguridadSocial: 7000, rol: 'empleado' },
  { empleada: 'Roberto Sánchez', mes: 9, anyo: 2026, salarioBruto: 180000, irpf: 18, seguridadSocial: 9000, rol: 'empleado' },
  { empleada: 'Marta Ruiz', mes: 9, anyo: 2026, salarioBruto: 140000, irpf: 15, seguridadSocial: 6500, rol: 'empleado' },
]