import { CATEGORIAS_GASTO } from './categorias-gasto'

export interface PresupuestoCategoria {
  categoriaId: string
  presupuestoAnual: number // en céntimos
}

export interface ComparacionPresupuesto {
  categoriaId: string
  categoriaLabel: string
  categoriaColor: string
  presupuesto: number
  actual: number
  diferencia: number
  porcentaje: number
}

export function compararPresupuesto(
  presupuestos: PresupuestoCategoria[],
  gastosReales: { categoriaGasto: string | null; total: number; tipo: string }[]
): ComparacionPresupuesto[] {
  const gastosPorCategoria: Record<string, number> = {}

  for (const g of gastosReales) {
    if (g.tipo !== 'gasto') continue
    const catId = g.categoriaGasto ?? 'otros'
    gastosPorCategoria[catId] = (gastosPorCategoria[catId] ?? 0) + g.total
  }

  return presupuestos.map(p => {
    const cat = CATEGORIAS_GASTO.find(c => c.id === p.categoriaId)
    const actual = gastosPorCategoria[p.categoriaId] ?? 0
    return {
      categoriaId: p.categoriaId,
      categoriaLabel: cat?.label ?? p.categoriaId,
      categoriaColor: cat?.color ?? '#6b7280',
      presupuesto: p.presupuestoAnual,
      actual,
      diferencia: p.presupuestoAnual - actual,
      porcentaje: p.presupuestoAnual > 0 ? Math.round((actual / p.presupuestoAnual) * 100) : 0,
    }
  })
}
