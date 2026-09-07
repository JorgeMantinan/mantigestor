'use client'

import { useMemo } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'

// Simulated sector averages (would come from API in production)
const MEDIAS_SECTOR: Record<string, { gastos: number; margen: number; ivaMedio: number }> = {
  'tecnologia': { gastos: 45, margen: 35, ivaMedio: 21 },
  'consultoria': { gastos: 30, margen: 50, ivaMedio: 21 },
  'comercio': { gastos: 60, margen: 20, ivaMedio: 21 },
  'hosteleria': { gastos: 55, margen: 25, ivaMedio: 10 },
  'construccion': { gastos: 50, margen: 30, ivaMedio: 21 },
  'servicios': { gastos: 35, margen: 40, ivaMedio: 21 },
  'profesionales': { gastos: 25, margen: 55, ivaMedio: 21 },
}

interface Factura {
  tipo: string
  baseImponible: number
  iva: number
  total: number
}

export function ComparativaSector({ facturas, sector = 'servicios' }: { facturas: Factura[]; sector?: string }) {
  const { t } = useLanguage()
  const stats = useMemo(() => {
    const ingresos = facturas.filter(f => f.tipo === 'ingreso')
    const gastos = facturas.filter(f => f.tipo === 'gasto')

    const totalIngresos = ingresos.reduce((s, f) => s + f.total, 0)
    const totalGastos = gastos.reduce((s, f) => s + f.total, 0)
    const totalIva = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)

    const margen = totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0
    const ratioGastos = totalIngresos > 0 ? (totalGastos / totalIngresos) * 100 : 0

    const media = MEDIAS_SECTOR[sector] ?? MEDIAS_SECTOR['servicios']!

    return {
      margen: Math.round(margen),
      ratioGastos: Math.round(ratioGastos),
      ivaMedio: ingresos.length > 0 ? Math.round(ingresos.reduce((s, f) => s + f.iva, 0) / ingresos.length) : 0,
      media,
      ingresosCount: ingresos.length,
      gastosCount: gastos.length,
    }
  }, [facturas, sector])

  const comparativas = [
    {
      label: t('comparativaSector.margenBeneficio'),
      valor: stats.margen,
      media: stats.media.margen,
      unidad: '%',
      mejor: stats.margen >= stats.media.margen,
    },
    {
      label: t('comparativaSector.ratioGastosIngresos'),
      valor: stats.ratioGastos,
      media: stats.media.gastos,
      unidad: '%',
      mejor: stats.ratioGastos <= stats.media.gastos,
    },
    {
      label: t('comparativaSector.ivaMedioFacturado'),
      valor: stats.ivaMedio,
      media: stats.media.ivaMedio,
      unidad: '%',
      mejor: stats.ivaMedio >= stats.media.ivaMedio,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4" /> {t('comparativaSector.comparativaSector').replace('{sector}', sector)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comparativas.map(c => {
            const diff = c.valor - c.media
            const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
            const color = c.mejor ? 'text-green-600' : 'text-red-600'

            return (
              <div key={c.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.valor}{c.unidad}</span>
                    <span className="text-xs text-muted-foreground">{t('comparativaSector.vsMedia').replace('{media}', String(c.media)).replace('{unidad}', c.unidad)}</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                  <div className="absolute h-full bg-muted-foreground/30 rounded-full"
                    style={{ width: `${Math.min(c.media, 100)}%` }} />
                  <div className={`absolute h-full rounded-full ${c.mejor ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(c.valor, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">0%</span>
                  <div className={`flex items-center gap-0.5 text-xs ${color}`}>
                    <Icon className="h-3 w-3" />
                    {diff > 0 ? '+' : ''}{diff}{c.unidad} {t('comparativaSector.vsMediaLabel')}
                  </div>
                  <span className="text-[10px] text-muted-foreground">100%</span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          {t('comparativaSector.mediaSimulada')}
        </p>
      </CardContent>
    </Card>
  )
}
