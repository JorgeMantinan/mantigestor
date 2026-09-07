'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { agruparGastosPorCategoria } from '@mantigestor/utils'
import { useLanguage } from '@/contexts/language-context'

interface ChartCategoriasProps {
  facturas: { categoriaGasto: string | null; total: number; tipo: string }[]
}

export function ChartCategorias({ facturas }: ChartCategoriasProps) {
  const { t } = useLanguage()
  const datos = useMemo(() => {
    const agrupados = agruparGastosPorCategoria(facturas)
    return Object.entries(agrupados)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.total - a.total)
  }, [facturas])

  const totalGeneral = datos.reduce((s, d) => s + d.total, 0)

  if (datos.length === 0) return null

  const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v / 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('chartCategorias.gastosPorCategoria')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra apilada visual */}
        <div className="h-4 w-full rounded-full overflow-hidden flex">
          {datos.map(d => (
            <div
              key={d.id}
              className="h-full transition-all"
              style={{
                width: `${(d.total / totalGeneral) * 100}%`,
                backgroundColor: d.color,
              }}
              title={`${d.label}: ${formatEuro(d.total)}`}
            />
          ))}
        </div>

        {/* Leyenda */}
        <div className="space-y-2">
          {datos.map(d => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.label}</span>
                <span className="text-xs text-muted-foreground">({d.count})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatEuro(d.total)}</span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {((d.total / totalGeneral) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-2 flex items-center justify-between text-sm font-bold">
          <span>{t('chartCategorias.totalGastos')}</span>
          <span>{formatEuro(totalGeneral)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
