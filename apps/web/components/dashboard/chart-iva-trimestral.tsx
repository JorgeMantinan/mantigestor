'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  tipo: string
  baseImponible: number
  iva: number
  fechaEmision: string
}

const TRIMESTRES_KEYS = ['chartIvaTrimestral.q1', 'chartIvaTrimestral.q2', 'chartIvaTrimestral.q3', 'chartIvaTrimestral.q4']

const formatEuros = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v / 100)

interface Props {
  facturas: Factura[]
}

export function ChartIvaTrimestral({ facturas }: Props) {
  const { t } = useLanguage()
  const trimestres = useMemo(() => TRIMESTRES_KEYS.map(k => t(k)), [t])

  const datos = useMemo(() => {
    const mapa = Array.from({ length: 4 }, () => ({ aIngresar: 0, soportado: 0 }))

    for (const f of facturas) {
      const mes = new Date(f.fechaEmision).getMonth()
      const q = Math.floor(mes / 3)
      const iva = Math.round(f.baseImponible * (f.iva / 100))
      if (f.tipo === 'ingreso') mapa[q]!.aIngresar += iva
      else mapa[q]!.soportado += iva
    }

    const ivaIngresarLabel = t('chartIvaTrimestral.ivaIngresar')
    const ivaSoportadoLabel = t('chartIvaTrimestral.ivaSoportado')

    return trimestres.map((name, i) => ({
      name,
      [ivaIngresarLabel]: mapa[i]!.aIngresar / 100,
      [ivaSoportadoLabel]: mapa[i]!.soportado / 100,
      Neto: (mapa[i]!.aIngresar - mapa[i]!.soportado) / 100,
    }))
  }, [facturas, trimestres, t])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('chartIvaTrimestral.ivaPorTrimestre')}</CardTitle>
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
              <Bar dataKey={t('chartIvaTrimestral.ivaIngresar')} fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t('chartIvaTrimestral.ivaSoportado')} fill="hsl(47, 95%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
