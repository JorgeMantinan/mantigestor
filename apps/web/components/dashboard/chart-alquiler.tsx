'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'

interface Props {
  ingresos: number
  gastos: number
}

const COLORES = ['hsl(160, 84%, 39%)', 'hsl(0, 84%, 60%)']

const formatEuros = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v / 100)

export function ChartAlquiler({ ingresos, gastos }: Props) {
  const { t } = useLanguage()
  const data = useMemo(() => [
    { name: t('chartAlquiler.ingresos'), value: ingresos / 100 },
    { name: t('chartAlquiler.gastos'), value: gastos / 100 },
  ], [ingresos, gastos, t])

  const total = ingresos + gastos
  const balance = ingresos - gastos

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('chartAlquiler.balanceAlquiler')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">{t('chartAlquiler.sinDatos')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t('chartAlquiler.balanceAlquiler')}</CardTitle>
          <span className={`text-xs font-medium ${balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatEuros(balance)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORES[i]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatEuros(value * 100)}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
