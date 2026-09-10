'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Copy, Share2, Check, Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { createClient } from '@/lib/supabase/client'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const PLAZOS_FISCALES: Record<number, { fecha: string; nombre: string }[]> = {
  1: [{ fecha: '01-30', nombre: 'Modelo 303 IVA Diciembre' }],
  4: [{ fecha: '04-20', nombre: 'Modelo 303 IVA Q1' }, { fecha: '04-20', nombre: 'Modelo 130 IRPF Q1' }],
  7: [{ fecha: '07-20', nombre: 'Modelo 303 IVA Q2' }, { fecha: '07-20', nombre: 'Modelo 130 IRPF Q2' }],
  10: [{ fecha: '10-20', nombre: 'Modelo 303 IVA Q3' }, { fecha: '10-20', nombre: 'Modelo 130 IRPF Q3' }],
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

export default function ResumenMensualPage() {
  const { t } = useLanguage()
  const { perfilActivoId } = usePersonaActiva()
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [copiado, setCopiado] = useState(false)
  const [facturas, setFacturas] = useState<{ tipo: string; baseImponible: number; iva: number; total: number; fechaEmision: string }[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!perfilActivoId) return
    setCargando(true)
    const [anio, mes] = mesSeleccionado.split('-').map(Number) as [number, number]
    const inicio = `${anio}-${String(mes).padStart(2, '0')}-01`
    const finMes = new Date(anio, mes, 0).getDate()
    const fin = `${anio}-${String(mes).padStart(2, '0')}-${String(finMes).padStart(2, '0')}`

    createClient()
      .from('facturas')
      .select('tipo, baseImponible, iva, total, fechaEmision')
      .eq('perfilId', perfilActivoId)
      .gte('fechaEmision', inicio)
      .lte('fechaEmision', fin)
      .then(({ data }) => {
        setFacturas(data ?? [])
        setCargando(false)
      })
  }, [perfilActivoId, mesSeleccionado])

  const stats = useMemo(() => {
    const ingresos = facturas.filter(f => f.tipo === 'ingreso')
    const gastos = facturas.filter(f => f.tipo === 'gasto')

    const totalIngresos = ingresos.reduce((s, f) => s + f.baseImponible, 0)
    const totalGastos = gastos.reduce((s, f) => s + f.baseImponible, 0)
    const ivaCobrado = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
    const ivaPagado = gastos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
    const resultadoNeto = totalIngresos - totalGastos

    const [anio, mes] = mesSeleccionado.split('-').map(Number) as [number, number]
    const plazos = PLAZOS_FISCALES[mes] ?? []
    const proximoPlazo = plazos.length > 0
      ? plazos.find(p => {
          const [pMes, pDia] = p.fecha.split('-').map(Number) as [number, number]
          const fechaPlazo = new Date(anio, pMes - 1, pDia)
          return fechaPlazo >= new Date()
        }) ?? plazos[0] ?? null
      : null

    return {
      totalIngresos,
      totalGastos,
      ivaCobrado,
      ivaPagado,
      resultadoNeto,
      proximoPlazo,
      totalFacturas: facturas.length,
      ingresosCount: ingresos.length,
      gastosCount: gastos.length,
    }
  }, [facturas, mesSeleccionado])

  const generarMensaje = useCallback(() => {
    const [anio, mes] = mesSeleccionado.split('-').map(Number) as [number, number]
    const nombreMes = MESES[mes - 1]

    let msg = `📊 *Resumen ${nombreMes} ${anio}*\n\n`
    msg += `💰 Ingresos: ${formatEuro(stats.totalIngresos)}\n`
    msg += `💸 Gastos: ${formatEuro(stats.totalGastos)}\n`
    msg += `📈 IVA cobrado: ${formatEuro(stats.ivaCobrado)}\n`
    msg += `📉 IVA pagado: ${formatEuro(stats.ivaPagado)}\n`
    msg += `✅ Resultado neto: ${formatEuro(stats.resultadoNeto)}\n`
    msg += `📄 Facturas: ${stats.totalFacturas} (${stats.ingresosCount} ingreso / ${stats.gastosCount} gasto)\n`

    if (stats.proximoPlazo) {
      msg += `\n⚠️ *Próximo plazo:* ${stats.proximoPlazo.nombre}\n`
    }

    msg += `\n_Generado por MantiGestor_`
    return msg
  }, [mesSeleccionado, stats])

  const handleCopiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generarMensaje())
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* noop */ }
  }, [generarMensaje])

  const handleCompartir = useCallback(async () => {
    const mensaje = generarMensaje()
    if (navigator.share) {
      try {
        await navigator.share({ text: mensaje })
      } catch { /* noop */ }
    } else {
      await navigator.clipboard.writeText(mensaje)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }, [generarMensaje])

  const ahora = new Date()
  const opcionesMes = useMemo(() => {
    const opts: string[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return opts
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumen mensual</h1>
          <p className="text-muted-foreground">Genera un resumen para compartir por WhatsApp o Telegram</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Mes</Label>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {opcionesMes.map(m => {
              const [a, mes] = m.split('-').map(Number) as [number, number]
              return <option key={m} value={m}>{MESES[mes - 1]} {a}</option>
            })}
          </select>
        </div>
      </div>

      {cargando ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ingresos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{formatEuro(stats.totalIngresos)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gastos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold text-red-600">{formatEuro(stats.totalGastos)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Resultado neto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${stats.resultadoNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatEuro(stats.resultadoNeto)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>IVA cobrado (ingresos)</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold">{formatEuro(stats.ivaCobrado)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>IVA pagado (gastos)</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-bold">{formatEuro(stats.ivaPagado)}</span>
          </CardContent>
        </Card>
      </div>

      {stats.proximoPlazo && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Próximo plazo fiscal</p>
                <p className="text-sm text-muted-foreground">{stats.proximoPlazo.nombre} — {stats.proximoPlazo.fecha}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Vista previa del mensaje
          </CardTitle>
          <CardDescription>Copia el mensaje o compártelo directamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm font-mono">
            {generarMensaje()}
          </pre>
          <div className="flex gap-3">
            <Button onClick={handleCopiar} variant="outline" className="flex-1">
              {copiado ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiado ? 'Copiado' : 'Copiar mensaje'}
            </Button>
            <Button onClick={handleCompartir} className="flex-1">
              <Share2 className="mr-2 h-4 w-4" />
              Compartir (WhatsApp/Telegram)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
