'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingUp, TrendingDown, Copy, Layers, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { detectarAnomalias, type Anomalia } from '@/lib/alertas-inteligentes'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  id: string
  tipo: string
  total: number
  emisorReceptor: string
  fechaEmision: string
  categoriaGasto: string | null
}

const ICONOS: Record<Anomalia['tipo'], React.ReactNode> = {
  gasto_alto: <AlertTriangle className="h-4 w-4 text-red-500" />,
  gasto_bajo: <TrendingDown className="h-4 w-4 text-yellow-500" />,
  nueva_categoria: <Layers className="h-4 w-4 text-yellow-500" />,
  gasto_duplicado: <Copy className="h-4 w-4 text-orange-500" />,
  tendencia_alza: <TrendingUp className="h-4 w-4 text-red-500" />,
}

const BG_SEVERIDAD: Record<string, string> = {
  alta: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
  media: 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30',
  baja: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30',
}

export function WidgetAlertasInteligentes({ facturas }: { facturas: Factura[] }) {
  const [expandido, setExpandido] = useState(false)
  const { t } = useLanguage()

  const anomalias = useMemo(() => detectarAnomalias(facturas), [facturas])

  const visibles = expandido ? anomalias : anomalias.slice(0, 5)

  if (anomalias.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> {t('widgetAlertasInteligentes.titulo')}
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {anomalias.length}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visibles.map((a, i) => (
            <div
              key={`${a.tipo}-${i}`}
              className={`flex items-start gap-3 p-3 rounded-lg border ${BG_SEVERIDAD[a.severidad] ?? BG_SEVERIDAD.baja}`}
            >
              <div className="mt-0.5 shrink-0">{ICONOS[a.tipo]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{a.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.descripcion}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  a.severidad === 'alta'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : a.severidad === 'media'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                }`}
              >
                {a.severidad}
              </span>
            </div>
          ))}
        </div>
        {anomalias.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs"
            onClick={() => setExpandido(prev => !prev)}
          >
            {expandido ? (
              <>{t('widgetAlertasInteligentes.verMenos')} <ChevronUp className="ml-1 h-3 w-3" /></>
            ) : (
              <>{t('widgetAlertasInteligentes.verTodas').replace('{count}', String(anomalias.length))} <ChevronDown className="ml-1 h-3 w-3" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
