'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiggyBank } from 'lucide-react'

interface Factura {
  tipo: string
  total: number
  fechaEmision: string
}

interface Nomina {
  salarioBruto: number
  rol: 'jefe' | 'empleado'
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatEuros = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v / 100)

interface Props {
  facturas: Factura[]
  nominas: Nomina[]
}

export function ChartEvolucion({ facturas, nominas }: Props) {
  const datos = useMemo(() => {
    const acumulado = Array.from({ length: 12 }, () => 0)
    const totalNominasJefe = nominas
      .filter(n => n.rol === 'jefe')
      .reduce((s, n) => s + n.salarioBruto, 0)

    for (const f of facturas) {
      const mes = new Date(f.fechaEmision).getMonth()
      if (f.tipo === 'ingreso') acumulado[mes]! += f.total
      else acumulado[mes]! -= f.total
    }

    // Restar nóminas del primer mes con datos
    if (totalNominasJefe > 0) {
      const primerMesConDatos = acumulado.findIndex(v => v !== 0)
      if (primerMesConDatos >= 0) acumulado[primerMesConDatos]! -= totalNominasJefe
    }

    let acum = 0
    return MESES_CORTOS.map((name, i) => {
      acum += acumulado[i]!
      return { name, Beneficio: acum / 100 }
    })
  }, [facturas, nominas])

  const beneficioFinal = datos[datos.length - 1]?.Beneficio ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Evolución beneficio neto</CardTitle>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PiggyBank className="h-3 w-3" aria-hidden="true" />
          <span className={`font-medium ${beneficioFinal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatEuros(beneficioFinal * 100)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datos} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBeneficio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toLocaleString('es-ES')}€`} />
              <Tooltip
                formatter={(value: number) => formatEuros(value * 100)}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <Area
                type="monotone"
                dataKey="Beneficio"
                stroke="hsl(160, 84%, 39%)"
                fill="url(#gradBeneficio)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
