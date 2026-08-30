'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Factura {
  total: number
  tipo: string
  fechaEmision: string
}

interface ChartComparativaProps {
  facturas: Factura[]
}

const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export function ChartComparativa({ facturas }: ChartComparativaProps) {
  const datos = useMemo(() => {
    const ahora = new Date()
    const mesActual = ahora.getMonth()
    const anyoActual = ahora.getFullYear()

    const mesAnterior = mesActual === 0 ? 11 : mesActual - 1
    const anyoAnterior = mesActual === 0 ? anyoActual - 1 : anyoActual

    const filtrar = (mes: number, anyo: number) =>
      facturas.filter(f => {
        const d = new Date(f.fechaEmision)
        return d.getMonth() === mes && d.getFullYear() === anyo
      })

    const actual = filtrar(mesActual, anyoActual)
    const anterior = filtrar(mesAnterior, anyoAnterior)

    const ingresosAct = actual.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
    const gastosAct = actual.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)
    const ingresosAnt = anterior.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
    const gastosAnt = anterior.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)

    return {
      mesActual: ahora.toLocaleDateString('es-ES', { month: 'long' }),
      mesAnterior: new Date(anyoAnterior, mesAnterior).toLocaleDateString('es-ES', { month: 'long' }),
      ingresos: { actual: ingresosAct, anterior: ingresosAnt },
      gastos: { actual: gastosAct, anterior: gastosAnt },
      beneficio: { actual: ingresosAct - gastosAct, anterior: ingresosAnt - gastosAnt },
    }
  }, [facturas])

  const calcCambio = (act: number, ant: number) => {
    if (ant === 0) return act > 0 ? 100 : 0
    return Math.round(((act - ant) / ant) * 100)
  }

  const CambioBadge = ({ actual, anterior }: { actual: number; anterior: number }) => {
    const cambio = calcCambio(actual, anterior)
    if (cambio === 0) return <Minus className="h-3 w-3 text-muted-foreground" />
    const Icon = cambio > 0 ? TrendingUp : TrendingDown
    const color = cambio > 0 ? 'text-green-600' : 'text-red-600'
    return (
      <span className={`flex items-center gap-0.5 text-xs ${color}`}>
        <Icon className="h-3 w-3" />
        {cambio > 0 ? '+' : ''}{cambio}%
      </span>
    )
  }

  const filas = [
    { label: 'Ingresos', ...datos.ingresos, color: 'text-green-600' },
    { label: 'Gastos', ...datos.gastos, color: 'text-red-600' },
    { label: 'Beneficio', ...datos.beneficio, color: datos.beneficio.actual >= 0 ? 'text-green-600' : 'text-red-600' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Comparativa mensual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground mb-3">
          <div className="capitalize">{datos.mesActual}</div>
          <div className="capitalize">{datos.mesAnterior}</div>
          <div>Cambio</div>
        </div>
        <div className="space-y-3">
          {filas.map(f => (
            <div key={f.label} className="grid grid-cols-3 gap-2 items-center text-sm">
              <div className={`text-right font-medium ${f.color}`}>{formatEuro(f.actual)}</div>
              <div className="text-right text-muted-foreground">{formatEuro(f.anterior)}</div>
              <div className="flex justify-center"><CambioBadge actual={f.actual} anterior={f.anterior} /></div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground border-t pt-2">
          <div className="text-center capitalize">{datos.mesActual}</div>
          <div className="text-center capitalize">{datos.mesAnterior}</div>
          <div className="text-center">Cambio</div>
        </div>
      </CardContent>
    </Card>
  )
}
