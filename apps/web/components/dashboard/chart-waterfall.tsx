'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

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

export function ChartWaterfall({ facturas }: Props) {
  const datos = useMemo(() => {
    const mapa = new Map<number, { ingresos: number; gastos: number }>()
    for (let m = 0; m < 12; m++) mapa.set(m, { ingresos: 0, gastos: 0 })

    for (const f of facturas) {
      const mes = new Date(f.fechaEmision).getMonth()
      const entry = mapa.get(mes)
      if (!entry) continue
      if (f.tipo === 'ingreso') entry.ingresos += f.total
      else entry.gastos += f.total
    }

    const rows: {
      name: string
      base: number
      ingresos: number
      gastos: number
      beneficio: number
      tipo: 'ingreso' | 'gasto' | 'beneficio'
    }[] = []

    for (let m = 0; m < 12; m++) {
      const entry = mapa.get(m) ?? { ingresos: 0, gastos: 0 }
      const ingEur = entry.ingresos / 100
      const gasEur = entry.gastos / 100
      const _neto = ingEur - gasEur

      if (m === 0) {
        rows.push({
          name: MESES_CORTOS[m] ?? '',
          base: 0,
          ingresos: ingEur,
          gastos: 0,
          beneficio: 0,
          tipo: 'ingreso',
        })
      } else {
        const prev = rows[m - 1]!
        const prevTop = prev.base + (prev.tipo === 'ingreso' ? prev.ingresos : prev.tipo === 'gasto' ? -prev.gastos : prev.beneficio)

        if (gasEur > 0) {
          rows.push({
            name: MESES_CORTOS[m] ?? '',
            base: prevTop + ingEur - gasEur,
            ingresos: 0,
            gastos: gasEur,
            beneficio: 0,
            tipo: 'gasto',
          })
        } else if (ingEur > 0) {
          rows.push({
            name: MESES_CORTOS[m] ?? '',
            base: prevTop,
            ingresos: ingEur,
            gastos: 0,
            beneficio: 0,
            tipo: 'ingreso',
          })
        } else {
          rows.push({
            name: MESES_CORTOS[m] ?? '',
            base: prevTop,
            ingresos: 0,
            gastos: 0,
            beneficio: 0,
            tipo: 'ingreso',
          })
        }
      }
    }

    const lastRow = rows[rows.length - 1]
    const lastTop = lastRow
      ? lastRow.base + (lastRow.tipo === 'ingreso' ? lastRow.ingresos : lastRow.tipo === 'gasto' ? -lastRow.gastos : lastRow.beneficio)
      : 0

    rows.push({
      name: 'Neto',
      base: 0,
      ingresos: 0,
      gastos: 0,
      beneficio: lastTop,
      tipo: 'beneficio',
    })

    return rows
  }, [facturas])

  const tooltipFormatter = (value: number, name: string) => {
    if (value === 0) return [null, null]
    return [formatEuros(value), name === 'base' ? '' : name]
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cascada ingresos → gastos → neto</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toLocaleString('es-ES')}€`} />
              <Tooltip
                formatter={tooltipFormatter}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                filterNull
              />
              <Bar dataKey="base" stackId="a" fill="transparent" />
              <Bar dataKey="ingresos" stackId="a" radius={[4, 4, 0, 0]}>
                {datos.map((entry, i) => (
                  <Cell key={i} fill={entry.ingresos > 0 ? 'hsl(160, 84%, 39%)' : 'transparent'} />
                ))}
              </Bar>
              <Bar dataKey="gastos" stackId="a" radius={[4, 4, 0, 0]}>
                {datos.map((entry, i) => (
                  <Cell key={i} fill={entry.gastos > 0 ? 'hsl(0, 84%, 60%)' : 'transparent'} />
                ))}
              </Bar>
              <Bar dataKey="beneficio" stackId="a" radius={[4, 4, 0, 0]}>
                {datos.map((entry, i) => (
                  <Cell key={i} fill={entry.name === 'Neto' ? 'hsl(220, 90%, 56%)' : 'transparent'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
