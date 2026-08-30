'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Factura {
  total: number
  tipo: string
  fechaEmision: string
}

interface ChartInteranualProps {
  facturas: Factura[]
}

const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export function ChartInteranual({ facturas }: ChartInteranualProps) {
  const datos = useMemo(() => {
    const ahora = new Date()
    const mesActual = ahora.getMonth()
    const anyoActual = ahora.getFullYear()

    const filtrar = (mes: number, anyo: number) =>
      facturas.filter(f => {
        const d = new Date(f.fechaEmision)
        return d.getMonth() === mes && d.getFullYear() === anyo
      })

    const meses = Array.from({ length: 12 }, (_, i) => ({
      nombre: new Date(2024, i).toLocaleDateString('es-ES', { month: 'short' }),
      actual: filtrar(i, anyoActual).filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0),
      anterior: filtrar(i, anyoActual - 1).filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0),
    }))

    const totalActual = meses.slice(0, mesActual + 1).reduce((s, m) => s + m.actual, 0)
    const totalAnterior = meses.slice(0, mesActual + 1).reduce((s, m) => s + m.anterior, 0)

    return {
      meses,
      mesActual,
      totalActual,
      totalAnterior,
      cambio: totalAnterior > 0 ? Math.round(((totalActual - totalAnterior) / totalAnterior) * 100) : 0,
    }
  }, [facturas])

  const CambioBadge = ({ cambio }: { cambio: number }) => {
    if (cambio === 0) return <Minus className="h-3 w-3 text-muted-foreground" />
    const Icon = cambio > 0 ? TrendingUp : TrendingDown
    const color = cambio > 0 ? 'text-green-600' : 'text-red-600'
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
        <Icon className="h-3 w-3" />
        {cambio > 0 ? '+' : ''}{cambio}%
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Comparativa interanual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Ingresos {new Date().getFullYear()}</p>
            <p className="text-lg font-bold">{formatEuro(datos.totalActual)}</p>
          </div>
          <CambioBadge cambio={datos.cambio} />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ingresos {new Date().getFullYear() - 1}</p>
            <p className="text-lg font-bold text-muted-foreground">{formatEuro(datos.totalAnterior)}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {datos.meses.slice(0, datos.mesActual + 1).map((m, i) => {
            const max = Math.max(m.actual, m.anterior, 1)
            return (
              <div key={i} className="grid grid-cols-[32px_1fr] gap-2 items-center text-xs">
                <span className="capitalize text-muted-foreground">{m.nombre}</span>
                <div className="flex gap-1 items-center">
                  <div className="h-2 bg-yellow-500/80 rounded" style={{ width: `${(m.actual / max) * 100}%` }} />
                  <div className="h-2 bg-muted rounded" style={{ width: `${(m.anterior / max) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 bg-yellow-500/80 rounded" /> {new Date().getFullYear()}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 bg-muted rounded" /> {new Date().getFullYear() - 1}</span>
        </div>
      </CardContent>
    </Card>
  )
}
