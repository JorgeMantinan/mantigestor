'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { compararConAnoAnterior, type ResultadoComparativa } from '@/lib/comparativa-anual'

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

interface Props {
  facturas: Array<{
    tipo: string
    baseImponible: number
    iva: number
    total: number
    fechaEmision: string
  }>
}

function VariacionBadge({ variacion }: { variacion: number }) {
  const positive = variacion > 0
  const neutral = variacion === 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        neutral
          ? 'bg-muted text-muted-foreground'
          : positive
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {neutral ? (
        <Minus className="h-3 w-3" />
      ) : positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {positive ? '+' : ''}{variacion}%
    </span>
  )
}

export function WidgetComparativaAnual({ facturas }: Props) {
  const resultado: ResultadoComparativa = useMemo(
    () => compararConAnoAnterior(facturas, new Date().getFullYear()),
    [facturas]
  )

  const items = [
    {
      label: 'Ingresos',
      data: resultado.ingresos,
      color: 'text-green-600',
    },
    {
      label: 'Gastos',
      data: resultado.gastos,
      color: 'text-red-600',
    },
    {
      label: 'Beneficio',
      data: resultado.beneficio,
      color: resultado.beneficio.actual >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'IVA neto',
      data: resultado.iva,
      color: resultado.iva.actual >= 0 ? 'text-red-600' : 'text-green-600',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comparativa interanual</CardTitle>
        <p className="text-xs text-muted-foreground">
          Enero–{resultado.mesComparado} · {new Date().getFullYear()} vs {new Date().getFullYear() - 1}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map(item => (
            <div key={item.label} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <VariacionBadge variacion={item.data.variacionPorcentual} />
              </div>
              <div className={`text-lg font-bold ${item.color}`}>
                {formatMoney(item.data.actual)}
              </div>
              <div className="text-xs text-muted-foreground">
                Año anterior: {formatMoney(item.data.anterior)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
