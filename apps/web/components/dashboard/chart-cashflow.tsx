'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

interface Factura {
  tipo: string
  total: number
  fechaEmision: string
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatEuros = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

interface Props {
  facturas: Factura[]
}

export function ChartCashflow({ facturas }: Props) {
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

    let acumulado = 0
    return Array.from(mapa.entries()).map(([mes, vals]) => {
      const neto = vals.ingresos - vals.gastos
      acumulado += neto
      return {
        name: MESES_CORTOS[mes],
        Ingresos: vals.ingresos / 100,
        Gastos: vals.gastos / 100,
        Balance: acumulado / 100,
      }
    })
  }, [facturas])

  const totalIngresos = facturas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0) / 100
  const totalGastos = facturas.filter(f => f.tipo !== 'ingreso').reduce((s, f) => s + f.total, 0) / 100
  const balance = totalIngresos - totalGastos

  const mesActual = new Date().getMonth()
  const etiquetaMes = MESES_CORTOS[mesActual]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Flujo de caja acumulado</CardTitle>
        <span className={`text-xs font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {balance >= 0 ? '+' : ''}{formatEuros(balance)}
        </span>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datos} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toLocaleString('es-ES')}€`} />
              <Tooltip
                formatter={(value: number, name: string) => [formatEuros(value), name]}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <ReferenceLine
                x={etiquetaMes}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                label={{ value: 'Actual', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--primary))' }}
              />
              <Area type="monotone" dataKey="Ingresos" stroke="hsl(160, 84%, 39%)" fill="url(#gradIngresos)" strokeWidth={2} />
              <Area type="monotone" dataKey="Gastos" stroke="hsl(0, 84%, 60%)" fill="url(#gradGastos)" strokeWidth={2} />
              <Area type="monotone" dataKey="Balance" stroke="hsl(221, 83%, 53%)" fill="none" strokeWidth={2} strokeDasharray="6 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
