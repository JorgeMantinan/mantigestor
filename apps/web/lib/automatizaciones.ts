const STORAGE_KEY = 'mantigestor_reglas'
const HISTORIAL_KEY = 'mantigestor_historial_reglas'

export type TipoCondicion =
  | 'importe_mayor_que'
  | 'importe_menor_que'
  | 'categoria_es'
  | 'cliente_es'
  | 'fecha_vencimiento_hoy'

export type TipoAccion =
  | 'crear_notificacion'
  | 'marcar_prioritaria'
  | 'enviar_email'
  | 'cambiar_estado'

export interface Condicion {
  tipo: TipoCondicion
  valor: string
}

export interface Accion {
  tipo: TipoAccion
  parametros: Record<string, string>
}

export interface Regla {
  id: string
  nombre: string
  condicion: Condicion
  accion: Accion
  activa: boolean
  ejecuciones: number
}

export interface EjecucionHistorial {
  id: string
  reglaId: string
  reglaNombre: string
  facturaId: string
  facturaConcepto: string
  fecha: string
  accionEjecutada: string
}

export interface FacturaInput {
  id: string
  tipo: string
  importeTotal: number
  categoria: string | null
  proveedorNombre: string | null
  concepto: string
  fecha: Date | string
}

const CONDICIONES_LABELS: Record<TipoCondicion, string> = {
  importe_mayor_que: 'Importe mayor que',
  importe_menor_que: 'Importe menor que',
  categoria_es: 'Categoría es',
  cliente_es: 'Cliente es',
  fecha_vencimiento_hoy: 'Fecha de vencimiento hoy',
}

const ACCIONES_LABELS: Record<TipoAccion, string> = {
  crear_notificacion: 'Crear notificación',
  marcar_prioritaria: 'Marcar como prioritaria',
  enviar_email: 'Enviar email',
  cambiar_estado: 'Cambiar estado',
}

export function getCondicionLabel(tipo: TipoCondicion): string {
  return CONDICIONES_LABELS[tipo]
}

export function getAccionLabel(tipo: TipoAccion): string {
  return ACCIONES_LABELS[tipo]
}

function leerReglas(): Regla[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getReglasEjemplo()
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Regla[]) : []
  } catch {
    return []
  }
}

function guardarReglas(reglas: Regla[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reglas))
}

function leerHistorial(): EjecucionHistorial[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORIAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as EjecucionHistorial[]) : []
  } catch {
    return []
  }
}

function guardarHistorial(historial: EjecucionHistorial[]): void {
  if (typeof window === 'undefined') return
  const ultimas10 = historial.slice(0, 10)
  localStorage.setItem(HISTORIAL_KEY, JSON.stringify(ultimas10))
}

export function listarReglas(): Regla[] {
  return leerReglas()
}

export function crearRegla(regla: Omit<Regla, 'id' | 'ejecuciones'>): Regla {
  const reglas = leerReglas()
  const nueva: Regla = {
    ...regla,
    id: crypto.randomUUID(),
    ejecuciones: 0,
  }
  reglas.push(nueva)
  guardarReglas(reglas)
  return nueva
}

export function actualizarRegla(id: string, datos: Omit<Regla, 'id' | 'ejecuciones'>): void {
  const reglas = leerReglas()
  const idx = reglas.findIndex(r => r.id === id)
  if (idx !== -1) {
    const actual = reglas[idx]!
    reglas[idx] = { ...actual, ...datos, id, ejecuciones: actual.ejecuciones }
    guardarReglas(reglas)
  }
}

export function eliminarRegla(id: string): void {
  const reglas = leerReglas().filter(r => r.id !== id)
  guardarReglas(reglas)
}

export function toggleActiva(id: string): void {
  const reglas = leerReglas()
  const regla = reglas.find(r => r.id === id)
  if (regla) {
    regla.activa = !regla.activa
    guardarReglas(reglas)
  }
}

export function incrementarEjecuciones(id: string): void {
  const reglas = leerReglas()
  const regla = reglas.find(r => r.id === id)
  if (regla) {
    regla.ejecuciones++
    guardarReglas(reglas)
  }
}

export function evaluarCondicion(condicion: Condicion, factura: FacturaInput): boolean {
  switch (condicion.tipo) {
    case 'importe_mayor_que':
      return factura.importeTotal > parseFloat(condicion.valor)
    case 'importe_menor_que':
      return factura.importeTotal < parseFloat(condicion.valor)
    case 'categoria_es':
      return factura.categoria === condicion.valor
    case 'cliente_es':
      return factura.proveedorNombre?.toLowerCase().includes(condicion.valor.toLowerCase()) ?? false
    case 'fecha_vencimiento_hoy': {
      const hoy = new Date().toISOString().slice(0, 10)
      const fechaFactura = typeof factura.fecha === 'string' ? factura.fecha : factura.fecha.toISOString().slice(0, 10)
      return fechaFactura === hoy
    }
    default:
      return false
  }
}

export function evaluarReglas(facturas: FacturaInput[], reglas: Regla[]): Array<{ regla: Regla; facturas: FacturaInput[] }> {
  const reglasActivas = reglas.filter(r => r.activa)
  const resultados: Array<{ regla: Regla; facturas: FacturaInput[] }> = []

  for (const regla of reglasActivas) {
    const facturasQueCumplen = facturas.filter(f => evaluarCondicion(regla.condicion, f))
    if (facturasQueCumplen.length > 0) {
      resultados.push({ regla, facturas: facturasQueCumplen })
    }
  }

  return resultados
}

export function ejecutarAccion(accion: Accion, factura: FacturaInput): EjecucionHistorial {
  const historial = leerHistorial()

  const entrada: EjecucionHistorial = {
    id: crypto.randomUUID(),
    reglaId: '',
    reglaNombre: accion.tipo,
    facturaId: factura.id,
    facturaConcepto: factura.concepto,
    fecha: new Date().toISOString(),
    accionEjecutada: `${getAccionLabel(accion.tipo)}${
      accion.parametros.mensaje ? `: ${accion.parametros.mensaje}` : ''
    }${accion.parametros.estado ? ` → ${accion.parametros.estado}` : ''}`,
  }

  historial.unshift(entrada)
  guardarHistorial(historial)

  return entrada
}

export function registrarEjecucion(reglaId: string, reglaNombre: string, factura: FacturaInput, accion: Accion): void {
  const historial = leerHistorial()

  const entrada: EjecucionHistorial = {
    id: crypto.randomUUID(),
    reglaId,
    reglaNombre,
    facturaId: factura.id,
    facturaConcepto: factura.concepto,
    fecha: new Date().toISOString(),
    accionEjecutada: `${getAccionLabel(accion.tipo)}${
      accion.parametros.mensaje ? `: ${accion.parametros.mensaje}` : ''
    }${accion.parametros.estado ? ` → ${accion.parametros.estado}` : ''}`,
  }

  historial.unshift(entrada)
  guardarHistorial(historial)
}

export function listarHistorial(): EjecucionHistorial[] {
  return leerHistorial()
}

function getReglasEjemplo(): Regla[] {
  const ejemplos: Regla[] = [
    {
      id: crypto.randomUUID(),
      nombre: 'Alerta facturas grandes',
      condicion: { tipo: 'importe_mayor_que', valor: '1000' },
      accion: { tipo: 'crear_notificacion', parametros: { mensaje: 'Factura con importe alto detectada' } },
      activa: true,
      ejecuciones: 0,
    },
    {
      id: crypto.randomUUID(),
      nombre: 'Marcar gastos de limpieza como prioritarios',
      condicion: { tipo: 'categoria_es', valor: 'material_limpieza' },
      accion: { tipo: 'marcar_prioritaria', parametros: {} },
      activa: true,
      ejecuciones: 0,
    },
    {
      id: crypto.randomUUID(),
      nombre: 'Notificar facturas de proveedor favorito',
      condicion: { tipo: 'cliente_es', valor: 'Suministros García' },
      accion: { tipo: 'crear_notificacion', parametros: { mensaje: 'Nueva factura de proveedor registrado' } },
      activa: false,
      ejecuciones: 0,
    },
  ]
  guardarReglas(ejemplos)
  return ejemplos
}
