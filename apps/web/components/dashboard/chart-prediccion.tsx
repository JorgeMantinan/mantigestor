'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  total: number
  tipo: string
  fechaEmision: string
}

interface ChartPrediccionProps {
  facturas: Factura[]
}

const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export function ChartPrediccion({ facturas }: ChartPrediccionProps) {
  const { t } = useLanguage()
  const datos = useMemo(() => {
    const ahora = new Date()
    const mesActual = ahora.getMonth()
    const anyoActual = ahora.getFullYear()

    // Calcular media de los últimos 3 meses
    const mesesHistorial = 3
    const ingresosMeses: number[] = []
    const gastosMeses: number[] = []

    for (let i = 0; i < mesesHistorial; i++) {
      const mes = mesActual - i
      const anyo = mes < 0 ? anyoActual - 1 : anyoActual
      const mesAbs = mes < 0 ? mes + 12 : mes

      const ingresos = facturas
        .filter(f => {
          const d = new Date(f.fechaEmision)
          return d.getMonth() === mesAbs && d.getFullYear() === anyo && f.tipo === 'ingreso'
        })
        .reduce((s, f) => s + f.total, 0)

      const gastos = facturas
        .filter(f => {
          const d = new Date(f.fechaEmision)
          return d.getMonth() === mesAbs && d.getFullYear() === anyo && f.tipo === 'gasto'
        })
        .reduce((s, f) => s + f.total, 0)

      ingresosMeses.push(ingresos)
      gastosMeses.push(gastos)
    }

    const mediaIngresos = ingresosMeses.reduce((s, v) => s + v, 0) / mesesHistorial
    const mediaGastos = gastosMeses.reduce((s, v) => s + v, 0) / mesesHistorial
    const mediaBeneficio = mediaIngresos - mediaGastos

    // Tendencia: comparar último mes con la media
    const ultimoIngreso = ingresosMeses[0] ?? 0
    const ultimoGasto = gastosMeses[0] ?? 0
    const tendenciaIngresos = mediaIngresos > 0 ? ((ultimoIngreso - mediaIngresos) / mediaIngresos) * 100 : 0
    const tendenciaGastos = mediaGastos > 0 ? ((ultimoGasto - mediaGastos) / mediaGastos) * 100 : 0

    // Predicción próximo mes (media ponderada: 60% último mes + 40% media)
    const predIngresos = Math.round(ultimoIngreso * 0.6 + mediaIngresos * 0.4)
    const predGastos = Math.round(ultimoGasto * 0.6 + mediaGastos * 0.4)
    const predBeneficio = predIngresos - predGastos

    return {
      mediaIngresos,
      mediaGastos,
      mediaBeneficio,
      predIngresos,
      predGastos,
      predBeneficio,
      tendenciaIngresos,
      tendenciaGastos,
    }
  }, [facturas])

  const TendenciaBadge = ({ valor }: { valor: number }) => {
    if (Math.abs(valor) < 1) return <Minus className="h-3 w-3 text-muted-foreground" />
    const Icon = valor > 0 ? TrendingUp : TrendingDown
    const color = valor > 0 ? 'text-green-600' : 'text-red-600'
    return (
      <span className={`flex items-center gap-0.5 text-xs ${color}`}>
        <Icon className="h-3 w-3" />
        {valor > 0 ? '+' : ''}{valor.toFixed(0)}%
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('chartPrediccion.prediccionProximoMes')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('chartPrediccion.ingresosEstimados')}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{formatEuro(datos.predIngresos)}</span>
              <TendenciaBadge valor={datos.tendenciaIngresos} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('chartPrediccion.gastosEstimados')}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{formatEuro(datos.predGastos)}</span>
              <TendenciaBadge valor={datos.tendenciaGastos} />
            </div>
          </div>
          <div className="border-t pt-2 flex items-center justify-between">
            <span className="text-xs font-medium">{t('chartPrediccion.beneficioEstimado')}</span>
            <span className={`text-sm font-bold ${datos.predBeneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatEuro(datos.predBeneficio)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t('chartPrediccion.basadoEnMedia')}
        </p>
      </CardContent>
    </Card>
  )
}
