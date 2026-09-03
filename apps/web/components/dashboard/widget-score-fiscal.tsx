'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ChevronDown, ChevronUp, Check, AlertTriangle, XCircle } from 'lucide-react'
import { calcularScoreFiscal, type FactorScore, type ScoreFiscal } from '@/lib/score-fiscal'

interface FacturaWidget {
  id: string
  tipo: string
  numero: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
  fechaVencimiento: string | null
  emisorReceptor: string
  categoriaGasto: string | null
}

interface PerfilWidget {
  nif?: string | null
}

function getColor(p: number): string {
  if (p >= 80) return '#16a34a'
  if (p >= 60) return '#eab308'
  if (p >= 40) return '#f97316'
  return '#ef4444'
}

function getColorClass(p: number): string {
  if (p >= 80) return 'text-green-600'
  if (p >= 60) return 'text-yellow-500'
  if (p >= 40) return 'text-orange-500'
  return 'text-red-600'
}

function EstadoIcon({ estado }: { estado: FactorScore['estado'] }) {
  if (estado === 'bien') return <Check className="h-4 w-4 text-green-600 shrink-0" />
  if (estado === 'mejorable') return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
  return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
}

function ScoreRing({ score, size = 120 }: { score: ScoreFiscal; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score.puntuacion / 100) * circ
  const color = getColor(score.puntuacion)

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={8}
        className="text-muted/40"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2 - 6}
        textAnchor="middle"
        className="text-2xl font-bold fill-foreground"
      >
        {score.puntuacion}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 14}
        textAnchor="middle"
        className="text-xs fill-muted-foreground"
      >
        /100
      </text>
    </svg>
  )
}

export function WidgetScoreFiscal({ facturas, perfil }: { facturas: FacturaWidget[]; perfil: PerfilWidget }) {
  const [expandido, setExpandido] = useState(false)

  const score = useMemo(
    () => calcularScoreFiscal(facturas, perfil),
    [facturas, perfil]
  )

  const factoresVisibles = expandido ? score.factores : score.factores.slice(0, 4)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Score fiscal
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <ScoreRing score={score} />
          <div className="flex-1 min-w-0">
            <p className={`text-lg font-bold ${getColorClass(score.puntuacion)}`}>
              {score.resumen}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {score.factores.filter(f => f.estado === 'bien').length} de {score.factores.length} factores óptimos
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {factoresVisibles.map(f => (
            <div key={f.nombre} className="flex items-center gap-2 text-sm">
              <EstadoIcon estado={f.estado} />
              <span className="flex-1 truncate">{f.nombre}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {f.puntos}/{f.maxPuntos}
              </span>
            </div>
          ))}
        </div>

        {score.factores.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs"
            onClick={() => setExpandido(prev => !prev)}
          >
            {expandido ? (
              <>Ver menos <ChevronUp className="ml-1 h-3 w-3" /></>
            ) : (
              <>Ver todos ({score.factores.length}) <ChevronDown className="ml-1 h-3 w-3" /></>
            )}
          </Button>
        )}

        {expandido && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Consejos para mejorar:</p>
            {score.factores.filter(f => f.estado !== 'bien').map(f => (
              <p key={f.nombre}>· <span className="font-medium">{f.nombre}:</span> {f.consejo}</p>
            ))}
            {score.factores.every(f => f.estado === 'bien') && (
              <p>Tu cumplimiento fiscal está en condiciones óptimas. ¡Sigue así!</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
