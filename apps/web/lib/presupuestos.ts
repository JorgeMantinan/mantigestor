const STORAGE_KEY = 'mantigestor_presupuestos'

export interface Presupuesto {
  id: string
  categoria: string
  amountMensual: number
  anyo: number
}

export function obtenerPresupuestos(): Presupuesto[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Presupuesto[]) : []
  } catch {
    return []
  }
}

export function guardarPresupuestos(presupuestos: Presupuesto[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presupuestos))
}

export function crearPresupuesto(p: Omit<Presupuesto, 'id'>): Presupuesto {
  const nuevo: Presupuesto = { ...p, id: crypto.randomUUID() }
  const todos = obtenerPresupuestos()
  todos.push(nuevo)
  guardarPresupuestos(todos)
  return nuevo
}

export function actualizarPresupuesto(p: Presupuesto): void {
  const todos = obtenerPresupuestos()
  const idx = todos.findIndex(x => x.id === p.id)
  if (idx !== -1) {
    todos[idx] = p
    guardarPresupuestos(todos)
  }
}

export function eliminarPresupuesto(id: string): void {
  const todos = obtenerPresupuestos().filter(x => x.id !== id)
  guardarPresupuestos(todos)
}

export function compararPresupuestoVsReal(
  categoria: string,
  gastosReales: number,
  presupuesto: number
): { gastado: number; presupuestado: number; diferencia: number; porcentaje: number } {
  return {
    gastado: gastosReales,
    presupuestado: presupuesto,
    diferencia: presupuesto - gastosReales,
    porcentaje: presupuesto > 0 ? Math.round((gastosReales / presupuesto) * 100) : 0,
  }
}

export interface ResumenCategoria {
  categoria: string
  gastado: number
  presupuestado: number
  diferencia: number
  porcentaje: number
}

export function obtenerResumenPresupuestos(
  presupuestos: Presupuesto[],
  gastosReales: Record<string, number>
): ResumenCategoria[] {
  return presupuestos.map(p => {
    const real = gastosReales[p.categoria] ?? 0
    const r = compararPresupuestoVsReal(p.categoria, real, p.amountMensual)
    return { ...r, categoria: p.categoria }
  })
}
