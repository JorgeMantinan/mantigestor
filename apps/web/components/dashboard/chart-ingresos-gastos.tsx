'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Factura {
  tipo: string
  total: number
  fechaEmision: string
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatEuros = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v / 100)

interface Props {
  facturas: Factura[]
}

export function ChartIngresosGastos({ facturas }: Props) {
  const datos = useMemo(() => {
    const mapa = new Map<number, { ingresos: number; gastos: number }>()
    for (let m = 0; m < 12; m++) mapa.set(m, { ingresos: 0, gastos: 0 })

    for (const f of facturas) {
      const fecha = new Date(f.fechaEmision)
      const mes = fecha.getMonth()
      const entry = mapa.get(mes)
      if (!entry) continue
      if (f.tipo === 'ingreso') entry.ingresos += f.total
      else entry.gastos += f.total
    }

    return Array.from(mapa.entries()).map(([mes, vals]) => ({
      name: MESES_CORTOS[mes],
      Ingresos: vals.ingresos / 100,
      Gastos: vals.gastos / 100,
    }))
  }, [facturas])

  const totalIngresos = facturas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0) / 100
  const totalGastos = facturas.filter(f => f.tipo !== 'ingreso').reduce((s, f) => s + f.total, 0) / 100

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Ingresos vs Gastos mensuales</CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden="true" />{formatEuros(totalIngresos * 100)}</span>
          <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" aria-hidden="true" />{formatEuros(totalGastos * 100)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toLocaleString('es-ES')}€`} />
              <Tooltip
                formatter={(value: number) => formatEuros(value * 100)}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ingresos" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
