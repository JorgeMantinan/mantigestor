'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { agruparGastosPorCategoria } from '@mantigestor/utils'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  total: number
  tipo: string
  categoriaGasto: string | null
}

interface ChartGastosCategoriaProps {
  facturas: Factura[]
}

const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export function ChartGastosCategoria({ facturas }: ChartGastosCategoriaProps) {
  const { t } = useLanguage()
  const datos = useMemo(() => {
    const gastos = facturas.filter(f => f.tipo === 'gasto')
    const porCategoria = agruparGastosPorCategoria(gastos)
    const total = gastos.reduce((s, f) => s + f.total, 0)

    const items = Object.entries(porCategoria)
      .map(([cat, info]) => ({
        categoria: cat,
        importe: info.total,
        label: info.label,
        color: info.color,
        porcentaje: total > 0 ? Math.round((info.total / total) * 100) : 0,
      }))
      .sort((a, b) => b.importe - a.importe)

    return { items, total }
  }, [facturas])

  if (datos.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('chartGastosCategoria.gastosPorCategoria')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">{t('chartGastosCategoria.sinGastos')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('chartGastosCategoria.gastosPorCategoria')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {datos.items.map(item => (
            <div key={item.categoria}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{item.porcentaje}%</span>
                  <span className="font-medium">{formatEuro(item.importe)}</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${item.porcentaje}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
          <span className="font-medium">{t('chartGastosCategoria.totalGastos')}</span>
          <span className="font-bold">{formatEuro(datos.total)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
