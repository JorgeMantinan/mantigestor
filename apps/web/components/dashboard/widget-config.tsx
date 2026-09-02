'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Eye, EyeOff, GripVertical } from 'lucide-react'

interface WidgetConfig {
  id: string
  label: string
  visible: boolean
}

const WIDGETS_PREDETERMINADOS: Omit<WidgetConfig, 'visible'>[] = [
  { id: 'sparklines', label: 'Sparklines en KPIs' },
  { id: 'chart-ingresos', label: 'Gráfica ingresos/gastos' },
  { id: 'chart-cashflow', label: 'Flujo de caja' },
  { id: 'chart-evolucion', label: 'Evolución mensual' },
  { id: 'chart-iva', label: 'IVA trimestral' },
  { id: 'chart-alquiler', label: 'Alquiler' },
  { id: 'chart-categorias', label: 'Categorías gasto' },
  { id: 'chart-presupuesto', label: 'Presupuesto vs real' },
  { id: 'chart-comparativa', label: 'Comparativa mensual' },
  { id: 'chart-interanual', label: 'Interanual' },
  { id: 'chart-prediccion', label: 'Predicción' },
  { id: 'chart-gastos-categoria', label: 'Gastos por categoría' },
  { id: 'calendario', label: 'Calendario fiscal' },
  { id: 'actividad', label: 'Actividad reciente' },
  { id: 'ultimas-facturas', label: 'Últimas facturas' },
  { id: 'alertas-iva', label: 'Alertas IVA' },
  { id: 'comparativa-sector', label: 'Comparativa sector' },
  { id: 'heatmap', label: 'Mapa de ingresos' },
  { id: 'top-gastos', label: 'Top gastos' },
  { id: 'prediccion', label: 'Predicción gastos' },
  { id: 'cobro', label: 'Ratio de cobro' },
]

const STORAGE_KEY = 'dashboard-widgets'

export function useWidgetConfig() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    if (typeof window === 'undefined') return WIDGETS_PREDETERMINADOS.map(w => ({ ...w, visible: true }))
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetConfig[]
        // Merge with defaults to handle new widgets
        return WIDGETS_PREDETERMINADOS.map(w => {
          const found = parsed.find(p => p.id === w.id)
          return { ...w, visible: found?.visible ?? true }
        })
      }
    } catch { /* ignore */ }
    return WIDGETS_PREDETERMINADOS.map(w => ({ ...w, visible: true }))
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
  }, [widgets])

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w))
  }, [])

  const resetWidgets = useCallback(() => {
    setWidgets(WIDGETS_PREDETERMINADOS.map(w => ({ ...w, visible: true })))
  }, [])

  const isVisible = useCallback((id: string) => {
    return widgets.find(w => w.id === id)?.visible ?? true
  }, [widgets])

  return { widgets, toggleWidget, resetWidgets, isVisible }
}

export function WidgetCustomizer({ widgets, onToggle, onReset }: {
  widgets: WidgetConfig[]
  onToggle: (id: string) => void
  onReset: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" /> Widgets del dashboard
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onReset}>Restablecer</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {widgets.map(w => (
            <button
              key={w.id}
              onClick={() => onToggle(w.id)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <span className="flex-1 text-left">{w.label}</span>
              {w.visible ? (
                <Eye className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
