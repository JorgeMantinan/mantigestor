'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Factura {
  tipo: string
  baseImponible: number
  iva: number
  fechaEmision: string
}

const TRIMESTRES = ['Q1', 'Q2', 'Q3', 'Q4']

const formatEuros = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v / 100)

interface Props {
  facturas: Factura[]
}

export function ChartIvaTrimestral({ facturas }: Props) {
  const datos = useMemo(() => {
    const mapa = Array.from({ length: 4 }, () => ({ aIngresar: 0, soportado: 0 }))

    for (const f of facturas) {
      const mes = new Date(f.fechaEmision).getMonth()
      const q = Math.floor(mes / 3)
      const iva = Math.round(f.baseImponible * (f.iva / 100))
      if (f.tipo === 'ingreso') mapa[q]!.aIngresar += iva
      else mapa[q]!.soportado += iva
    }

    return TRIMESTRES.map((name, i) => ({
      name,
      'IVA a ingresar': mapa[i]!.aIngresar / 100,
      'IVA soportado': mapa[i]!.soportado / 100,
      Neto: (mapa[i]!.aIngresar - mapa[i]!.soportado) / 100,
    }))
  }, [facturas])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">IVA por trimestre</CardTitle>
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
              <Bar dataKey="IVA a ingresar" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="IVA soportado" fill="hsl(47, 95%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
