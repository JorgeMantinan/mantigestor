'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  tipo: string
  total: number
  categoriaGasto: string | null
}

const formatEuro = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const COLORES = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-amber-500',
  'bg-rose-500',
]

export function WidgetTopGastos({ facturas }: { facturas: Factura[] }) {
  const { t } = useLanguage()
  const topGastos = useMemo(() => {
    const gastos = facturas.filter(f => f.tipo === 'gasto')
    const porCategoria = new Map<string, number>()

    gastos.forEach(f => {
      const cat = f.categoriaGasto || t('widgetTopGastos.sinCategoria')
      porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + f.total)
    })

    const ordenadas = Array.from(porCategoria.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const maximo = ordenadas[0]?.[1] ?? 1

    return ordenadas.map(([categoria, total]) => ({
      categoria,
      total,
      porcentaje: Math.round((total / maximo) * 100),
    }))
  }, [t, facturas])

  if (topGastos.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" /> {t('widgetTopGastos.titulo')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topGastos.map((g, i) => (
            <div key={g.categoria}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground truncate">{g.categoria}</span>
                <span className="font-medium shrink-0 ml-2">{formatEuro(g.total)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${COLORES[i] ?? COLORES[4]}`}
                  style={{ width: `${g.porcentaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
