'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, AlertTriangle } from 'lucide-react'
import { analizarClientes } from '@/lib/analisis-clientes'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  tipo: string
  emisorReceptor: string
  total: number
  fechaEmision: string
  fechaVencimiento: string | null
  estado: string
}

const formatEuros = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export function WidgetClientes({ facturas }: { facturas: Factura[] }) {
  const { t } = useLanguage()
  const analisis = useMemo(() => analizarClientes(facturas), [facturas])

  if (analisis.totalClientes === 0) return null

  const top3 = analisis.topClientes.slice(0, 3)
  const maxTotal = top3[0]?.totalFacturado ?? 1

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" aria-hidden="true" />
          {t('widgetClientes.titulo')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Resumen */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2.5">
            <p className="text-[10px] text-muted-foreground leading-tight">{t('widgetClientes.clientesTotales')}</p>
            <p className="text-lg font-bold leading-tight">{analisis.totalClientes}</p>
          </div>
          <div className="rounded-lg border p-2.5">
            <p className="text-[10px] text-muted-foreground leading-tight">{t('widgetClientes.retencion')}</p>
            <p className="text-lg font-bold leading-tight">{analisis.retencion}%</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{t('widgetClientes.clientesRecurrentes')}</p>
          </div>
        </div>

        {/* Top 3 clientes con barras */}
        <div className="space-y-2">
          {top3.map((c, _i) => {
            const share = analisis.concentracion > 0 ? Math.round((c.totalFacturado / (analisis.topClientes.reduce((s, cl) => s + cl.totalFacturado, 0) || 1)) * 100) : 0
            return (
              <div key={c.nombre} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate">{c.nombre}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">{share}% · {formatEuros(c.totalFacturado)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(4, (c.totalFacturado / maxTotal) * 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Indicador concentración */}
        {analisis.concentracion > 60 && (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">{t('widgetClientes.riesgo')}</span> {t('widgetClientes.top3DelTotal').replace('{count}', String(analisis.concentracion))}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
