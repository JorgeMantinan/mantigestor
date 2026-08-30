export const CATEGORIAS_GASTO = [
  { id: 'suministros', label: 'Suministros', color: '#3b82f6' },
  { id: 'alquiler', label: 'Alquiler', color: '#f97316' },
  { id: 'nómina', label: 'Nómina', color: '#8b5cf6' },
  { id: 'seguridad-social', label: 'Seguridad Social', color: '#ef4444' },
  { id: 'marketing', label: 'Marketing', color: '#22c55e' },
  { id: 'seguros', label: 'Seguros', color: '#06b6d4' },
  { id: 'profesionales', label: 'Honorarios profesionales', color: '#eab308' },
  { id: 'material', label: 'Material y suministros', color: '#a855f7' },
  { id: 'transporte', label: 'Transporte', color: '#14b8a6' },
  { id: 'comunicaciones', label: 'Comunicaciones', color: '#f43f5e' },
  { id: 'formación', label: 'Formación', color: '#6366f1' },
  { id: 'otros', label: 'Otros gastos', color: '#6b7280' },
] as const

export type CategoriaGastoId = typeof CATEGORIAS_GASTO[number]['id']

export function obtenerCategoriaGasto(id: string | null | undefined) {
  if (!id) return null
  return CATEGORIAS_GASTO.find(c => c.id === id) ?? null
}

export function obtenerColorCategoria(id: string | null | undefined): string {
  return obtenerCategoriaGasto(id)?.color ?? '#6b7280'
}

export function agruparGastosPorCategoria(
  facturas: { categoriaGasto: string | null; total: number; tipo: string }[]
): Record<string, { total: number; count: number; label: string; color: string }> {
  const resultado: Record<string, { total: number; count: number; label: string; color: string }> = {}

  for (const f of facturas) {
    if (f.tipo !== 'gasto') continue
    const catId = f.categoriaGasto ?? 'otros'
    const cat = CATEGORIAS_GASTO.find(c => c.id === catId) ?? { id: catId, label: catId, color: '#6b7280' }
    if (!resultado[catId]) {
      resultado[catId] = { total: 0, count: 0, label: cat.label, color: cat.color }
    }
    resultado[catId].total += f.total
    resultado[catId].count++
  }

  return resultado
}
