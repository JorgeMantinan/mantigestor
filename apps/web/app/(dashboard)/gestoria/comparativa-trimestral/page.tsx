'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, ArrowRight, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { usePersonaActiva } from '@/contexts/persona-activa-context'

interface Factura {
  fechaEmision: string
  tipo: string
  baseImponible: number
  iva: number
  total: number
}

interface ResumenTrimestre {
  ingresos: number
  gastos: number
  ivaIngresos: number
  ivaGastos: number
  beneficio: number
}

const TRIMESTRES = ['Q1', 'Q2', 'Q3', 'Q4']
const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

function calcularResumen(facturas: Factura[], anyo: number, q: number): ResumenTrimestre {
  const inicio = new Date(anyo, q * 3, 1)
  const fin = new Date(anyo, (q + 1) * 3, 0)
  const filtradas = facturas.filter(f => {
    const d = new Date(f.fechaEmision)
    return d >= inicio && d <= fin
  })
  const ingresos = filtradas.filter(f => f.tipo === 'ingreso')
  const gastos = filtradas.filter(f => f.tipo === 'gasto')
  const totalIngresos = ingresos.reduce((s, f) => s + f.total, 0)
  const totalGastos = gastos.reduce((s, f) => s + f.total, 0)
  const ivaIngresos = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const ivaGastos = gastos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  return {
    ingresos: totalIngresos,
    gastos: totalGastos,
    ivaIngresos,
    ivaGastos,
    beneficio: totalIngresos - totalGastos,
  }
}

function porcentajeCambio(actual: number, anterior: number): number {
  if (anterior === 0) return actual > 0 ? 100 : 0
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

export default function ComparativaTrimestralPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [anyoActual, setAnyoActual] = useState(new Date().getFullYear())
  const [trimestre, setTrimestre] = useState(Math.floor(new Date().getMonth() / 3))
  const [cargando, setCargando] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])
  const { perfilActivoId } = usePersonaActiva()

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }
      const anyoAnterior = anyoActual - 1
      const { data } = await getSupabase()
        .from('facturas')
        .select('fechaEmision, tipo, baseImponible, iva, total')
        .eq('perfilId', perfilActivoId ?? user.id)
        .gte('fechaEmision', `${anyoAnterior}-01-01`)
        .lt('fechaEmision', `${anyoActual + 1}-01-01`)
      if (data) setFacturas(data as Factura[])
      setCargando(false)
    }
    cargar()
  }, [getSupabase, anyoActual, perfilActivoId])

  const resumenActual = calcularResumen(facturas, anyoActual, trimestre)
  const resumenAnterior = calcularResumen(facturas, anyoActual - 1, trimestre)

  const fmtPct = (v: number) => {
    if (v === 0) return '0%'
    const sign = v > 0 ? '+' : ''
    return `${sign}${v.toFixed(1)}%`
  }

  const PctBadge = ({ valor }: { valor: number }) => {
    if (valor === 0) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" />0%</span>
    const color = valor > 0 ? 'text-green-600' : 'text-red-600'
    const Icon = valor > 0 ? TrendingUp : TrendingDown
    return <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}><Icon className="h-3 w-3" />{fmtPct(valor)}</span>
  }

  const chartData = [
    {
      name: 'Ingresos',
      [TRIMESTRES[trimestre] + ' ' + (anyoActual - 1)]: resumenAnterior.ingresos / 100,
      [TRIMESTRES[trimestre] + ' ' + anyoActual]: resumenActual.ingresos / 100,
    },
    {
      name: 'Gastos',
      [TRIMESTRES[trimestre] + ' ' + (anyoActual - 1)]: resumenAnterior.gastos / 100,
      [TRIMESTRES[trimestre] + ' ' + anyoActual]: resumenActual.gastos / 100,
    },
    {
      name: 'Beneficio',
      [TRIMESTRES[trimestre] + ' ' + (anyoActual - 1)]: resumenAnterior.beneficio / 100,
      [TRIMESTRES[trimestre] + ' ' + anyoActual]: resumenActual.beneficio / 100,
    },
  ]

  const keyAnterior = TRIMESTRES[trimestre] + ' ' + (anyoActual - 1)
  const keyActual = TRIMESTRES[trimestre] + ' ' + anyoActual

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comparativa trimestral</h1>
          <p className="text-muted-foreground">Compara el trimestre actual con el mismo trimestre del año anterior</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnyoActual(y => y - 1)}>{anyoActual - 1}</Button>
          <span className="text-sm font-medium">{anyoActual}</span>
          <Button variant="outline" size="sm" onClick={() => setAnyoActual(y => y + 1)} disabled={anyoActual >= new Date().getFullYear()}>{anyoActual + 1}</Button>
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2, 3].map(q => (
          <Button key={q} variant={trimestre === q ? 'default' : 'outline'} size="sm"
            onClick={() => setTrimestre(q)}>
            {TRIMESTRES[q]}
          </Button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando datos...</p>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{TRIMESTRES[trimestre]} {anyoActual - 1}</span>
            <ArrowRight className="h-4 w-4" />
            <span className="font-medium">{TRIMESTRES[trimestre]} {anyoActual}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
                <p className="text-xl font-bold text-green-600">{formatEuro(resumenActual.ingresos)}</p>
                <div className="mt-1">
                  <PctBadge valor={porcentajeCambio(resumenActual.ingresos, resumenAnterior.ingresos)} />
                  <span className="text-xs text-muted-foreground ml-1">vs {formatEuro(resumenAnterior.ingresos)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Gastos</p>
                <p className="text-xl font-bold text-red-600">{formatEuro(resumenActual.gastos)}</p>
                <div className="mt-1">
                  <PctBadge valor={porcentajeCambio(resumenActual.gastos, resumenAnterior.gastos)} />
                  <span className="text-xs text-muted-foreground ml-1">vs {formatEuro(resumenAnterior.gastos)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">IVA neto</p>
                <p className="text-xl font-bold text-blue-600">{formatEuro(resumenActual.ivaIngresos - resumenActual.ivaGastos)}</p>
                <div className="mt-1">
                  <PctBadge valor={porcentajeCambio(resumenActual.ivaIngresos - resumenActual.ivaGastos, resumenAnterior.ivaIngresos - resumenAnterior.ivaGastos)} />
                  <span className="text-xs text-muted-foreground ml-1">vs {formatEuro(resumenAnterior.ivaIngresos - resumenAnterior.ivaGastos)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Beneficio</p>
                <p className={`text-xl font-bold ${resumenActual.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatEuro(resumenActual.beneficio)}</p>
                <div className="mt-1">
                  <PctBadge valor={porcentajeCambio(resumenActual.beneficio, resumenAnterior.beneficio)} />
                  <span className="text-xs text-muted-foreground ml-1">vs {formatEuro(resumenAnterior.beneficio)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Comparación {TRIMESTRES[trimestre]} {anyoActual - 1} vs {TRIMESTRES[trimestre]} {anyoActual}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toLocaleString('es-ES')}€`} />
                    <Tooltip
                      formatter={(value: number) => formatEuro(value * 100)}
                      contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey={keyAnterior} fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={keyActual} fill="hsl(47, 95%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
