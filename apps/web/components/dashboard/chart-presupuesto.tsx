'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { compararPresupuesto, CATEGORIAS_GASTO } from '@mantigestor/utils'
import { useLanguage } from '@/contexts/language-context'

interface ChartPresupuestoProps {
  facturas: { categoriaGasto: string | null; total: number; tipo: string }[]
}

const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export function ChartPresupuesto({ facturas }: ChartPresupuestoProps) {
  const { t } = useLanguage()
  const [editando, setEditando] = useState(false)
  const [presupuestos, setPresupuestos] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIAS_GASTO.map(c => [c.id, 0]))
  )

  const resultados = useMemo(
    () => compararPresupuesto(
      Object.entries(presupuestos)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ categoriaId: k, presupuestoAnual: v })),
      facturas
    ).filter(r => r.presupuesto > 0),
    [presupuestos, facturas]
  )

  const totalPresupuesto = resultados.reduce((s, r) => s + r.presupuesto, 0)
  const totalActual = resultados.reduce((s, r) => s + r.actual, 0)

  if (resultados.length === 0 && !editando) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">{t('chartPresupuesto.presupuestoVsReal')}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            {t('chartPresupuesto.configurar')}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            {t('chartPresupuesto.configuraCategorias')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{t('chartPresupuesto.presupuestoVsReal')}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditando(!editando)}>
          {editando ? t('chartPresupuesto.ver') : t('chartPresupuesto.configurar')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editando ? (
          <div className="space-y-2">
            {CATEGORIAS_GASTO.slice(0, 8).map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs w-32 truncate">{cat.label}</span>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  value={presupuestos[cat.id] ? (presupuestos[cat.id]! / 100).toFixed(0) : ''}
                  onChange={e => setPresupuestos(prev => ({
                    ...prev,
                    [cat.id]: (parseFloat(e.target.value) || 0) * 100
                  }))}
                  className="h-7 w-24 text-xs"
                />
                <span className="text-xs text-muted-foreground">{t('chartPresupuesto.eurosAno')}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {resultados.map(r => {
                const excedido = r.porcentaje > 100
                return (
                  <div key={r.categoriaId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.categoriaColor }} />
                        <span>{r.categoriaLabel}</span>
                      </div>
                      <span className={excedido ? 'text-destructive font-medium' : ''}>
                        {r.porcentaje}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all"
                        style={{
                          width: `${Math.min(r.porcentaje, 100)}%`,
                          backgroundColor: excedido ? '#ef4444' : r.categoriaColor,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t('chartPresupuesto.real')} {formatEuro(r.actual)}</span>
                      <span>{t('chartPresupuesto.presupuesto')} {formatEuro(r.presupuesto)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {resultados.length > 1 && (
              <div className="border-t pt-2 flex items-center justify-between text-xs font-bold">
                <span>Total ({t('chartPresupuesto.totalCategorias').replace('{count}', String(resultados.length))})</span>
                <span className={totalActual > totalPresupuesto ? 'text-destructive' : 'text-green-600'}>
                  {formatEuro(totalActual)} / {formatEuro(totalPresupuesto)}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
