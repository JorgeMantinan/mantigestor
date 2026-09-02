'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { analizarBenchmarking, type Insight } from '@/lib/ia-benchmarking'

interface Factura {
  tipo: string
  total: number
  baseImponible: number
  iva: number
  categoriaGasto: string | null
  fechaEmision: string
}

function PuntuacionRing({ puntuacion }: { puntuacion: number }) {
  const radio = 36
  const circunferencia = 2 * Math.PI * radio
  const offset = circunferencia - (puntuacion / 100) * circunferencia

  const color = puntuacion >= 70 ? '#16a34a' : puntuacion >= 40 ? '#eab308' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radio} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={radio}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color }}>{puntuacion}</span>
        <span className="text-[9px] text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

function InsightIcon({ tipo }: { tipo: Insight['tipo'] }) {
  switch (tipo) {
    case 'positivo':
      return <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
    case 'alerta':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
    default:
      return <TrendingDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  }
}

export function WidgetBenchmarking({ facturas }: { facturas: Factura[] }) {
  const [expanded, setExpanded] = useState(false)

  const resultado = useMemo(() => {
    if (facturas.length === 0) return null
    return analizarBenchmarking(facturas)
  }, [facturas])

  if (!resultado) return null

  const topInsights = resultado.insights.slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-purple-500" /> Benchmarking IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <PuntuacionRing puntuacion={resultado.puntuacion} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-1">
              {resultado.puntuacion >= 70 ? 'Saludable' :
               resultado.puntuacion >= 40 ? 'Mejorable' : 'Crítico'}
            </p>
            <p className="text-xs text-muted-foreground">
              Margen: {(resultado.metricas.margenBruto * 100).toFixed(1)}% · Gastos: {(resultado.metricas.ratioGastos * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {topInsights.length > 0 && (
          <div className="mt-4 space-y-2">
            {topInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border p-2">
                <InsightIcon tipo={insight.tipo} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-none mb-0.5">{insight.titulo}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{insight.descripcion}</p>
                </div>
                <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                  insight.impacto === 'alto' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  insight.impacto === 'medio' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {insight.impacto}
                </span>
              </div>
            ))}
          </div>
        )}

        {resultado.recomendaciones.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Ver recomendaciones ({resultado.recomendaciones.length})
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1.5">
                {resultado.recomendaciones.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 mt-0.5 h-1 w-1 rounded-full bg-purple-500" />
                    {rec}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
