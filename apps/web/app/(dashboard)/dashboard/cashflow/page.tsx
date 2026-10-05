'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowDownLeft, ArrowUpRight, Clock, Calendar, TrendingUp, Wallet, AlertCircle, RefreshCw } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine
} from 'recharts'

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  total: number
  iva: number
  fechaEmision: string
  fechaVencimiento: string | null
  estado: string
  emisorReceptor: string
  numero: string
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const _DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function obtenerRangoFechas() {
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const inicioSemana = new Date(hoy)
  inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1)
  if (inicioSemana.getDay() === 0) inicioSemana.setDate(inicioSemana.getDate() - 6)
  return { hoy, inicioMes, inicioSemana }
}

export default function CashflowPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { perfilActivoId } = usePersonaActiva()
  const getSupabase = useCallback(() => createClient(), [])

  const fetchCashflowData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      let perfilId = perfilActivoId || user.id

      if (perfilActivoId) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('id')
          .eq('id', perfilActivoId)
          .single()
        if (perfil) perfilId = perfil.id
      } else {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('id')
          .eq('userId', user.id)
          .single()
        if (perfil) perfilId = perfil.id
      }

      const anyoActual = new Date().getFullYear()
      const { data: facturasData } = await supabase
        .from('facturas')
        .select('*')
        .eq('perfilId', perfilId)
        .gte('fechaEmision', `${anyoActual}-01-01`)
        .lt('fechaEmision', `${anyoActual + 1}-01-01`)
        .order('fechaEmision', { ascending: false })

      if (facturasData) setFacturas(facturasData as Factura[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
      setLastUpdated(new Date())
    }
  }, [getSupabase, perfilActivoId])

  useEffect(() => {
    fetchCashflowData()
  }, [fetchCashflowData])

  const { hoy, inicioMes, inicioSemana } = useMemo(() => obtenerRangoFechas(), [])

  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  const semanaStr = `${inicioSemana.getFullYear()}-${String(inicioSemana.getMonth() + 1).padStart(2, '0')}-${String(inicioSemana.getDate()).padStart(2, '0')}`
  const mesStr = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, '0')}-${String(inicioMes.getDate()).padStart(2, '0')}`

  const ingresosHoy = facturas
    .filter(f => f.tipo === 'ingreso' && f.fechaEmision === hoyStr)
    .reduce((s, f) => s + f.total, 0)

  const gastosHoy = facturas
    .filter(f => f.tipo === 'gasto' && f.fechaEmision === hoyStr)
    .reduce((s, f) => s + f.total, 0)

  const ingresosSemana = facturas
    .filter(f => f.tipo === 'ingreso' && f.fechaEmision >= semanaStr)
    .reduce((s, f) => s + f.total, 0)

  const gastosSemana = facturas
    .filter(f => f.tipo === 'gasto' && f.fechaEmision >= semanaStr)
    .reduce((s, f) => s + f.total, 0)

  const ingresosMes = facturas
    .filter(f => f.tipo === 'ingreso' && f.fechaEmision >= mesStr)
    .reduce((s, f) => s + f.total, 0)

  const gastosMes = facturas
    .filter(f => f.tipo === 'gasto' && f.fechaEmision >= mesStr)
    .reduce((s, f) => s + f.total, 0)

  const pendientesCobro = facturas
    .filter(f => f.tipo === 'ingreso' && f.estado === 'pendiente')
    .reduce((s, f) => s + f.total, 0)

  const proximasFacturas = facturas
    .filter(f => f.tipo === 'ingreso' && f.fechaVencimiento && f.fechaVencimiento >= hoyStr && f.estado !== 'pagada')
    .sort((a, b) => (a.fechaVencimiento ?? '').localeCompare(b.fechaVencimiento ?? ''))
    .slice(0, 5)

  const datosGrafico = useMemo(() => {
    const mapa = new Map<number, { ingresos: number; gastos: number }>()
    for (let d = 1; d <= 31; d++) mapa.set(d, { ingresos: 0, gastos: 0 })

    for (const f of facturas) {
      const fecha = new Date(f.fechaEmision)
      const dia = fecha.getDate()
      const entry = mapa.get(dia)
      if (!entry) continue
      if (f.tipo === 'ingreso') entry.ingresos += f.total
      else entry.gastos += f.total
    }

    let acumulado = 0
    return Array.from(mapa.entries()).map(([dia, vals]) => {
      const neto = vals.ingresos - vals.gastos
      acumulado += neto
      return {
        name: String(dia),
        Ingresos: vals.ingresos / 100,
        Gastos: vals.gastos / 100,
        Acumulado: acumulado / 100,
      }
    }).filter(d => {
      const diaNum = parseInt(d.name)
      return diaNum <= new Date().getDate() + 5
    })
  }, [facturas])

  const balanceNeto = ingresosMes - gastosMes

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Flujo de Caja</h1>
          <p className="text-muted-foreground">
            Vista en tiempo real de ingresos y gastos
            {lastUpdated && ` · Actualizado: ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCashflowData} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del mes</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balanceNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(balanceNeto)}
            </div>
            <p className="text-xs text-muted-foreground">
              {ingresosMes > 0 ? `${Math.round((ingresosMes / (ingresosMes + gastosMes)) * 100)}% ingresos` : 'Sin actividad'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ArrowDownLeft className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">{formatMoney(ingresosHoy)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">{formatMoney(gastosHoy)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Neto: {formatMoney(ingresosHoy - gastosHoy)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ArrowDownLeft className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">{formatMoney(ingresosSemana)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">{formatMoney(gastosSemana)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Neto: {formatMoney(ingresosSemana - gastosSemana)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente cobro</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatMoney(pendientesCobro)}
            </div>
            <p className="text-xs text-muted-foreground">
              {facturas.filter(f => f.tipo === 'ingreso' && f.estado === 'pendiente').length} facturas pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de flujo de caja diario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Flujo de caja diario — {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] animate-pulse rounded bg-muted" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={datosGrafico} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCashIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCashOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toLocaleString('es-ES')}€`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatMoney(value * 100), name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  />
                  <ReferenceLine
                    x={String(hoy.getDate())}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 4"
                    label={{ value: 'Hoy', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="Ingresos" stroke="hsl(160, 84%, 39%)" fill="url(#gradCashIn)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Gastos" stroke="hsl(0, 84%, 60%)" fill="url(#gradCashOut)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Acumulado" stroke="hsl(221, 83%, 53%)" fill="none" strokeWidth={2} strokeDasharray="6 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos cobros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Próximos vencimientos de cobro</CardTitle>
        </CardHeader>
        <CardContent>
          {proximasFacturas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay cobros próximos programados
            </p>
          ) : (
            <div className="space-y-2">
              {proximasFacturas.map(f => {
                const diasRestantes = Math.ceil(
                  (new Date(f.fechaVencimiento!).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        diasRestantes <= 3
                          ? 'bg-red-100 dark:bg-red-900'
                          : diasRestantes <= 7
                            ? 'bg-yellow-100 dark:bg-yellow-900'
                            : 'bg-green-100 dark:bg-green-900'
                      }`}>
                        {diasRestantes <= 3 ? (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.emisorReceptor}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.numero} · Vence: {new Date(f.fechaVencimiento!).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-green-600">+{formatMoney(f.total)}</span>
                      <p className={`text-xs ${
                        diasRestantes <= 3 ? 'text-red-600' : diasRestantes <= 7 ? 'text-yellow-600' : 'text-muted-foreground'
                      }`}>
                        {diasRestantes === 0 ? 'Hoy' : diasRestantes === 1 ? 'Mañana' : `${diasRestantes} días`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
