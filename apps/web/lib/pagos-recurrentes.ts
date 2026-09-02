const STORAGE_KEY = 'mantigestor_pagos_recurrentes'

export interface PagoRecurrente {
  id: string
  concepto: string
  importe: number
  dia_pago: number
  categoria: string
  activo: boolean
  ultimaFechaPago: string | null
  notas: string
}

export const CATEGORIAS_PAGO = [
  'Alquiler',
  'Suministros',
  'Internet',
  'Seguro',
  'Suscripciones',
  'Transporte',
  'Otros',
] as const

export type CategoriaPago = (typeof CATEGORIAS_PAGO)[number]

function leerLocalStorage(): PagoRecurrente[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as PagoRecurrente[]) : []
  } catch {
    return []
  }
}

function guardarLocalStorage(pagos: PagoRecurrente[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pagos))
}

export function listarPagos(): PagoRecurrente[] {
  return leerLocalStorage()
}

export function crearPago(pago: Omit<PagoRecurrente, 'id'>): PagoRecurrente {
  const pagos = leerLocalStorage()
  const nuevo: PagoRecurrente = {
    ...pago,
    id: crypto.randomUUID(),
  }
  pagos.push(nuevo)
  guardarLocalStorage(pagos)
  return nuevo
}

export function actualizarPago(id: string, cambios: Partial<Omit<PagoRecurrente, 'id'>>): PagoRecurrente | null {
  const pagos = leerLocalStorage()
  const pago = pagos.find(p => p.id === id)
  if (!pago) return null
  const actualizado: PagoRecurrente = { ...pago, ...cambios, id }
  const idx = pagos.indexOf(pago)
  pagos[idx] = actualizado
  guardarLocalStorage(pagos)
  return actualizado
}

export function eliminarPago(id: string): boolean {
  const pagos = leerLocalStorage()
  const antes = pagos.length
  const filtrados = pagos.filter(p => p.id !== id)
  if (filtrados.length === antes) return false
  guardarLocalStorage(filtrados)
  return true
}

export function toggleActivo(id: string): PagoRecurrente | null {
  const pagos = leerLocalStorage()
  const pago = pagos.find(p => p.id === id)
  if (!pago) return null
  const actualizado: PagoRecurrente = { ...pago, activo: !pago.activo }
  const idx = pagos.indexOf(pago)
  pagos[idx] = actualizado
  guardarLocalStorage(pagos)
  return actualizado
}

export function marcarComoPagado(id: string, fecha: string = new Date().toISOString().slice(0, 10)): PagoRecurrente | null {
  const pagos = leerLocalStorage()
  const pago = pagos.find(p => p.id === id)
  if (!pago) return null
  const actualizado: PagoRecurrente = { ...pago, ultimaFechaPago: fecha }
  const idx = pagos.indexOf(pago)
  pagos[idx] = actualizado
  guardarLocalStorage(pagos)
  return actualizado
}

function estaPagoEsteMes(pago: PagoRecurrente, fechaActual: Date): boolean {
  if (!pago.ultimaFechaPago) return false
  const ultima = new Date(pago.ultimaFechaPago)
  return (
    ultima.getFullYear() === fechaActual.getFullYear() &&
    ultima.getMonth() === fechaActual.getMonth()
  )
}

export function obtenerPagosPendientes(fechaActual: Date = new Date()): PagoRecurrente[] {
  return leerLocalStorage().filter(
    pago => pago.activo && !estaPagoEsteMes(pago, fechaActual)
  )
}

export function obtenerPagosDelMes(fechaActual: Date = new Date()): PagoRecurrente[] {
  return leerLocalStorage().filter(
    pago => pago.activo && pago.dia_pago <= new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate()
  )
}

export function estaPagadoEsteMes(pago: PagoRecurrente, fechaActual: Date = new Date()): boolean {
  return estaPagoEsteMes(pago, fechaActual)
}

export function calcularTotalMensual(): number {
  return leerLocalStorage()
    .filter(p => p.activo)
    .reduce((sum, p) => sum + p.importe, 0)
}

export function obtenerDiasConPagos(anyo: number, mes: number): Map<number, PagoRecurrente[]> {
  const mapa = new Map<number, PagoRecurrente[]>()
  const pagos = leerLocalStorage().filter(p => p.activo)

  for (const pago of pagos) {
    const diasEnMes = new Date(anyo, mes + 1, 0).getDate()
    const dia = Math.min(pago.dia_pago, diasEnMes)
    const existentes = mapa.get(dia) || []
    existentes.push(pago)
    mapa.set(dia, existentes)
  }

  return mapa
}
