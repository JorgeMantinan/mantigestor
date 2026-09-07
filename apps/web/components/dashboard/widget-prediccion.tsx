'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { predecirGastos } from '@/lib/prediccion-gastos'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  total: number
  tipo: string
  fechaEmision: string
}

const formatEuro = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

function confianzaLabel(c: number, t: (key: string) => string): string {
  if (c >= 0.7) return t('widgetPrediccion.alta')
  if (c >= 0.4) return t('widgetPrediccion.media')
  return t('widgetPrediccion.baja')
}

function confianzaColor(c: number): string {
  if (c >= 0.7) return 'bg-green-500'
  if (c >= 0.4) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function WidgetPrediccion({ facturas }: { facturas: Factura[] }) {
  const { t } = useLanguage()
  const datos = useMemo(() => {
    if (facturas.length === 0) return null
    return predecirGastos(facturas)
  }, [facturas])

  const barras = useMemo(() => {
    if (!facturas.length) return []

    const ahora = new Date()
    const mesActual = ahora.getMonth()
    const anyoActual = ahora.getFullYear()
    const nombresMeses = [t('widgetPrediccion.ene'), t('widgetPrediccion.feb'), t('widgetPrediccion.mar'), t('widgetPrediccion.abr'), t('widgetPrediccion.may'), t('widgetPrediccion.jun'), t('widgetPrediccion.jul'), t('widgetPrediccion.ago'), t('widgetPrediccion.sep'), t('widgetPrediccion.oct'), t('widgetPrediccion.nov'), t('widgetPrediccion.dic')]

    const meses: { mes: string; total: number; esPrediccion: boolean }[] = []

    for (let i = 5; i >= 1; i--) {
      const mes = mesActual - i
      const anyo = mes < 0 ? anyoActual - 1 : anyoActual
      const mesAbs = mes < 0 ? mes + 12 : mes

      const total = facturas
        .filter(f => {
          const d = new Date(f.fechaEmision)
          return d.getMonth() === mesAbs && d.getFullYear() === anyo && f.tipo === 'gasto'
        })
        .reduce((s, f) => s + f.total, 0)

      meses.push({ mes: nombresMeses[mesAbs] ?? '', total, esPrediccion: false })
    }

    const primeraPred = datos?.predicciones[0]
    if (primeraPred) {
      meses.push({ mes: primeraPred.mes.split(' ')[0] ?? '', total: primeraPred.gastoPrevisto, esPrediccion: true })
    }

    return meses
  }, [facturas, datos])

  if (!datos || barras.length === 0 || !datos.predicciones[0]) return null

  const maximo = Math.max(...barras.map(b => b.total), 1)
  const prediccion = datos.predicciones[0]

  const TendenciaIcon = datos.tendencia === 'subida' ? TrendingUp : datos.tendencia === 'bajada' ? TrendingDown : Minus
  const tendenciaColor = datos.tendencia === 'subida' ? 'text-red-500' : datos.tendencia === 'bajada' ? 'text-green-500' : 'text-muted-foreground'
  const tendenciaLabel = datos.tendencia === 'subida' ? t('widgetPrediccion.subida') : datos.tendencia === 'bajada' ? t('widgetPrediccion.bajada') : t('widgetPrediccion.estable')

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-500" /> {t('widgetPrediccion.titulo')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('widgetPrediccion.proximoMes')}</p>
              <p className="text-2xl font-bold">{formatEuro(prediccion.gastoPrevisto)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-xs font-medium ${tendenciaColor}`}>
                <TendenciaIcon className="h-3 w-3" />
                {tendenciaLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('widgetPrediccion.confianza')}</span>
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${confianzaColor(prediccion.confianza)}`} style={{ width: `${prediccion.confianza * 100}%` }} />
            </div>
            <span className="text-xs font-medium">{confianzaLabel(prediccion.confianza, t)}</span>
          </div>

          <div className="flex items-end gap-1 h-20">
            {barras.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm ${b.esPrediccion ? 'border-2 border-dashed border-orange-400 bg-orange-400/20' : 'bg-orange-500'}`}
                  style={{ height: `${Math.max((b.total / maximo) * 100, 4)}%` }}
                />
                <span className="text-[9px] text-muted-foreground leading-none">{b.mes}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
