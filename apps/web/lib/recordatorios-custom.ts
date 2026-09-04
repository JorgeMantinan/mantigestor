const STORAGE_KEY = 'mantigestor_recordatorios_custom'

export type TipoRecordatorio = 'factura_vencimiento' | 'modelo_fiscal' | 'pago_recibido' | 'personalizado'

export type Repetir = 'no' | 'diario' | 'semanal' | 'mensual' | 'anual'

export interface Recordatorio {
  id: string
  titulo: string
  descripcion: string
  fecha: string
  tipo: TipoRecordatorio
  activo: boolean
  completado: boolean
  completadoEn?: string
  repetir: Repetir
  creadoEn: string
}

const TIPO_LABELS: Record<TipoRecordatorio, string> = {
  factura_vencimiento: 'Factura vencimiento',
  modelo_fiscal: 'Modelo fiscal',
  pago_recibido: 'Pago recibido',
  personalizado: 'Personalizado',
}

const REPETIR_LABELS: Record<Repetir, string> = {
  no: 'No repetir',
  diario: 'Diario',
  semanal: 'Semanal',
  mensual: 'Mensual',
  anual: 'Anual',
}

export function getTipoLabel(tipo: TipoRecordatorio): string {
  return TIPO_LABELS[tipo]
}

export function getRepetirLabel(repetir: Repetir): string {
  return REPETIR_LABELS[repetir]
}

function leerRecordatorios(): Recordatorio[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Recordatorio[] : []
  } catch {
    return []
  }
}

function guardarRecordatorios(recordatorios: Recordatorio[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recordatorios))
}

export function listarRecordatorios(): Recordatorio[] {
  return leerRecordatorios().sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  )
}

export function crearRecordatorio(datos: Omit<Recordatorio, 'id' | 'creadoEn' | 'completado' | 'completadoEn'>): Recordatorio {
  const recordatorios = leerRecordatorios()
  const nuevo: Recordatorio = {
    ...datos,
    id: crypto.randomUUID(),
    completado: false,
    creadoEn: new Date().toISOString(),
  }
  recordatorios.push(nuevo)
  guardarRecordatorios(recordatorios)
  return nuevo
}

export function actualizarRecordatorio(id: string, datos: Partial<Omit<Recordatorio, 'id' | 'creadoEn'>>): void {
  const recordatorios = leerRecordatorios()
  const idx = recordatorios.findIndex(r => r.id === id)
  if (idx === -1) return
  const existente = recordatorios[idx]
  if (!existente) return
  recordatorios[idx] = { ...existente, ...datos, id: existente.id, creadoEn: existente.creadoEn }
  guardarRecordatorios(recordatorios)
}

export function eliminarRecordatorio(id: string): void {
  const recordatorios = leerRecordatorios().filter(r => r.id !== id)
  guardarRecordatorios(recordatorios)
}

export function marcarCompletado(id: string): void {
  const recordatorios = leerRecordatorios()
  const idx = recordatorios.findIndex(r => r.id === id)
  if (idx === -1) return
  const rec = recordatorios[idx]
  if (!rec) return
  rec.completado = true
  rec.completadoEn = new Date().toISOString()
  if (rec.repetir !== 'no') {
    const fecha = new Date(rec.fecha + 'T00:00:00')
    switch (rec.repetir) {
      case 'diario': fecha.setDate(fecha.getDate() + 1); break
      case 'semanal': fecha.setDate(fecha.getDate() + 7); break
      case 'mensual': fecha.setMonth(fecha.getMonth() + 1); break
      case 'anual': fecha.setFullYear(fecha.getFullYear() + 1); break
    }
    const fechaStr = fecha.toISOString().split('T')[0] ?? fecha.toISOString().slice(0, 10)
    recordatorios.push({
      ...rec,
      id: crypto.randomUUID(),
      completado: false,
      completadoEn: undefined,
      fecha: fechaStr,
      creadoEn: new Date().toISOString(),
    })
  }
  guardarRecordatorios(recordatorios)
}

export function obtenerRecordatoriosPendientes(): Recordatorio[] {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return leerRecordatorios()
    .filter(r => !r.completado && r.activo)
    .filter(r => new Date(r.fecha) >= hoy)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
}

export function obtenerRecordatoriosVencidos(): Recordatorio[] {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return leerRecordatorios()
    .filter(r => !r.completado && r.activo)
    .filter(r => new Date(r.fecha) < hoy)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
}

export function obtenerRecordatoriosEstaSemana(): Recordatorio[] {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const finSemana = new Date(hoy)
  finSemana.setDate(finSemana.getDate() + 7)
  return leerRecordatorios()
    .filter(r => !r.completado && r.activo)
    .filter(r => {
      const f = new Date(r.fecha)
      return f >= hoy && f <= finSemana
    })
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
}

export function obtenerRecordatoriosPorFecha(fecha: string): Recordatorio[] {
  return leerRecordatorios()
    .filter(r => r.fecha === fecha)
    .sort((a, b) => (a.completado === b.completado ? 0 : a.completado ? 1 : -1))
}
