'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface Factura {
  tipo: string
  total: number
  fechaEmision: string
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_COMPLETOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const formatEuros = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v / 100)

interface Props {
  facturas: Factura[]
}

function getColor(intensity: number): string {
  if (intensity === 0) return 'bg-muted'
  if (intensity < 0.15) return 'bg-emerald-100 dark:bg-emerald-950'
  if (intensity < 0.3) return 'bg-emerald-200 dark:bg-emerald-900'
  if (intensity < 0.45) return 'bg-emerald-300 dark:bg-emerald-800'
  if (intensity < 0.6) return 'bg-emerald-400 dark:bg-emerald-700'
  if (intensity < 0.75) return 'bg-emerald-500 dark:bg-emerald-600'
  if (intensity < 0.9) return 'bg-emerald-600 dark:bg-emerald-500'
  return 'bg-emerald-700 dark:bg-emerald-400'
}

function getTextColor(intensity: number): string {
  return intensity < 0.6 ? 'text-foreground' : 'text-white'
}

export function ChartHeatmap({ facturas }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

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

    const maxIngresos = Math.max(1, ...Array.from(mapa.values()).map(v => v.ingresos))

    return Array.from(mapa.entries()).map(([mes, vals]) => ({
      mes,
      ingresos: vals.ingresos,
      gastos: vals.gastos,
      beneficio: vals.ingresos - vals.gastos,
      intensity: vals.ingresos / maxIngresos,
    }))
  }, [facturas])

  const ahora = new Date()
  const mesActual = ahora.getMonth()
  const anyoActual = ahora.getFullYear()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Mapa de ingresos mensuales</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
          {datos.map(d => {
            const esActual = d.mes === mesActual
            const isActive = hovered === d.mes
            return (
              <div
                key={d.mes}
                className="relative"
                onMouseEnter={() => setHovered(d.mes)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className={`flex flex-col items-center justify-center rounded-lg p-2 min-h-[72px] transition-all ${getColor(d.intensity)} ${getTextColor(d.intensity)} ${esActual ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''} ${isActive ? 'scale-105 shadow-md' : ''}`}
                >
                  <span className="text-[10px] font-medium opacity-80">{MESES_CORTOS[d.mes]}</span>
                  <span className="text-xs font-bold mt-0.5">{formatEuros(d.ingresos)}</span>
                </div>
                {isActive && (
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg border bg-popover p-3 shadow-lg pointer-events-none">
                    <p className="text-xs font-semibold mb-1">{MESES_COMPLETOS[d.mes]} {anyoActual}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ingresos</span>
                        <span className="font-medium text-green-600">{formatEuros(d.ingresos)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gastos</span>
                        <span className="font-medium text-red-600">{formatEuros(d.gastos)}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between">
                        <span className="text-muted-foreground">Beneficio</span>
                        <span className={`font-bold ${d.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatEuros(d.beneficio)}
                        </span>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
