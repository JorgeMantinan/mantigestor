'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react'
import {
  predecirIngresos,
  predecirGastos,
  predecirBeneficio,
  type ResultadoPrediccion,
} from '@/lib/forecasting'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  total: number
  tipo: string
  fechaEmision: string
}

const formatEuro = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

function confianzaBar(c: number, t: (key: string) => string) {
  const color = c >= 0.7 ? 'bg-green-500' : c >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
  const label = c >= 0.7 ? t('widgetForecasting.alta') : c >= 0.4 ? t('widgetForecasting.media') : t('widgetForecasting.baja')
  return { color, label }
}

function TrendIcon({ tendencia }: { tendencia: ResultadoPrediccion['tendencia'] }) {
  if (tendencia === 'creciente') return <TrendingUp className="h-4 w-4 text-green-600" />
  if (tendencia === 'decreciente') return <TrendingDown className="h-4 w-4 text-red-600" />
  return <Minus className="h-4 w-4 text-muted-foreground" />
}

function MiniSparkline({
  historial,
  predicciones,
  color,
  height = 32,
}: {
  historial: number[]
  predicciones: number[]
  color: string
  height?: number
}) {
  const todos = [...historial, ...predicciones]
  if (todos.length < 2) return null

  const max = Math.max(...todos, 1)
  const min = Math.min(...todos, 0)
  const range = max - min || 1
  const total = todos.length
  const width = 160

  const point = (val: number, i: number) => {
    const x = (i / (total - 1)) * width
    const y = ((max - val) / range) * height
    return { x, y }
  }

  const solidPoints = historial.map((v, i) => point(v, i))
  const dashedPoints = [
    point(historial[historial.length - 1] ?? 0, historial.length - 1),
    ...predicciones.map((v, i) => point(v, historial.length + i)),
  ]

  const solidPath = solidPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const dashedPath = dashedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const areaPath = `${solidPath} L${solidPoints[solidPoints.length - 1]?.x ?? 0},${height} L${solidPoints[0]?.x ?? 0},${height} Z`

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={`forecast-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${areaPath}`} fill={`url(#forecast-${color.replace('#', '')})`} />
      <polyline points={solidPath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline
        points={dashedPath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
      {dashedPoints.slice(1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} opacity={0.5} />
      ))}
    </svg>
  )
}

export function WidgetForecasting({ facturas }: { facturas: Factura[] }) {
  const { t } = useLanguage()
  const datos = useMemo(() => {
    if (facturas.length === 0) return null

    const predIng = predecirIngresos(facturas)
    const predGas = predecirGastos(facturas)
    const beneficios = predecirBeneficio(predIng, predGas)

    const mejorConfianza = Math.min(predIng.predicciones[0]?.confianza ?? 0, predGas.predicciones[0]?.confianza ?? 0)

    return {
      predIng,
      predGas,
      beneficios,
      confianza: mejorConfianza,
    }
  }, [facturas])

  if (!datos || datos.predIng.predicciones.length === 0) return null

  const { predIng, predGas, beneficios, confianza } = datos
  const primerBeneficio = beneficios[0]
  const { color: confColor, label: confLabel } = confianzaBar(confianza, t)

  const tendenciaIngresos = predIng.tendencia === 'creciente' ? 'text-green-600' : predIng.tendencia === 'decreciente' ? 'text-red-600' : 'text-muted-foreground'
  const tendenciaGastos = predGas.tendencia === 'creciente' ? 'text-red-600' : predGas.tendencia === 'decreciente' ? 'text-green-600' : 'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-500" /> {t('widgetForecasting.titulo')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sparkline historial + predicción */}
          <div className="flex items-center justify-center gap-4">
            <MiniSparkline historial={predIng.historial} predicciones={predIng.predicciones.map(p => p.ingresoPrevisto)} color="#16a34a" />
            <MiniSparkline historial={predGas.historial} predicciones={predGas.predicciones.map(p => p.gastoPrevisto)} color="#ef4444" />
          </div>

          {/* Ingresos */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">{t('widgetForecasting.ingresos')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{formatEuro(primerBeneficio?.ingresoPrevisto ?? 0)}</span>
              <span className={`flex items-center gap-0.5 text-xs ${tendenciaIngresos}`}>
                <TrendIcon tendencia={predIng.tendencia} />
                {predIng.variacionPorcentual > 0 ? '+' : ''}{predIng.variacionPorcentual.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Gastos */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">{t('widgetForecasting.gastos')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{formatEuro(primerBeneficio?.gastoPrevisto ?? 0)}</span>
              <span className={`flex items-center gap-0.5 text-xs ${tendenciaGastos}`}>
                <TrendIcon tendencia={predGas.tendencia} />
                {predGas.variacionPorcentual > 0 ? '+' : ''}{predGas.variacionPorcentual.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Beneficio */}
          <div className="border-t pt-2 flex items-center justify-between">
            <span className="text-xs font-medium">{t('widgetForecasting.beneficioPrevisto')}</span>
            <span className={`text-sm font-bold ${(primerBeneficio?.beneficioPrevisto ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatEuro(primerBeneficio?.beneficioPrevisto ?? 0)}
            </span>
          </div>

          {/* Confianza */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('widgetForecasting.confianza')}</span>
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${confColor}`} style={{ width: `${confianza * 100}%` }} />
            </div>
            <span className="text-xs font-medium">{confLabel}</span>
          </div>

          {/* Próximos meses */}
          <div className="border-t pt-2 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('widgetForecasting.proximosMeses')}</p>
            <div className="grid grid-cols-3 gap-2">
              {beneficios.map((b, i) => (
                <div key={i} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{b.mes}</p>
                  <p className={`text-xs font-bold ${b.beneficioPrevisto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatEuro(b.beneficioPrevisto)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
