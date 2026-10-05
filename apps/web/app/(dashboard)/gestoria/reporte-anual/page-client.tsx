'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Download, TrendingUp, TrendingDown, Receipt, PiggyBank, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { CATEGORIAS_GASTO } from '@mantigestor/utils'
import {
  generarReporteAnual, exportarReportePDF,
  type ReporteAnual, type FacturaInput,
} from '@/lib/reporte-anual'

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const formatPct = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v / 100)

export function ReporteAnualPageClient() {
  const { perfilActivoId } = usePersonaActiva()
  const { t } = useLanguage()
  const [reporte, setReporte] = useState<ReporteAnual | null>(null)
  const [anyo, setAnyo] = useState(new Date().getFullYear())
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const getSupabase = useCallback(() => createClient(), [])

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCargando(false); return }

    const perfilId = perfilActivoId ?? user.id

    const { data, error } = await supabase
      .from('facturas')
      .select('tipo, emisorReceptor, fechaEmision, baseImponible, iva, total, categoriaGasto')
      .eq('perfilId', perfilId)
      .gte('fechaEmision', `${anyo}-01-01`)
      .lt('fechaEmision', `${anyo + 1}-01-01`)
      .limit(1000)

    if (error) { setCargando(false); return }

    const facturas: FacturaInput[] = ((data ?? []) as Record<string, unknown>[]).map(f => ({
      tipo: f.tipo as 'ingreso' | 'gasto',
      emisorReceptor: f.emisorReceptor as string,
      fechaEmision: f.fechaEmision as string,
      baseImponible: f.baseImponible as number,
      iva: f.iva as number,
      total: f.total as number,
      categoriaGasto: (f.categoriaGasto as string) ?? null,
    }))

    const resultado = generarReporteAnual(facturas, anyo)
    setReporte(resultado)
    setCargando(false)
  }, [getSupabase, perfilActivoId, anyo])

  useEffect(() => { void cargarDatos() }, [cargarDatos])

  const handleExportPDF = async () => {
    if (!reporte) return
    setExportando(true)
    try {
      await exportarReportePDF(reporte)
    } finally {
      setExportando(false)
    }
  }

  const SECTION_LABELS: Record<string, string> = {
    resumen: t('reporteAnual.resumen'),
    meses: t('reporteAnual.meses'),
    categorias: t('reporteAnual.categorias'),
    clientes: t('reporteAnual.clientesTop'),
    iva: t('reporteAnual.ivaPorTrimestre'),
    ratios: t('reporteAnual.ratiosFinancieros'),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">{t('reporteAnual.titulo')}</h1>
            <p className="text-muted-foreground">
              {t('reporteAnual.subtitulo')} {anyo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnyo(y => y - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> {anyo - 1}
          </Button>
          <span className="text-sm font-medium px-2">{anyo}</span>
          <Button variant="outline" size="sm" onClick={() => setAnyo(y => y + 1)} disabled={anyo >= new Date().getFullYear()}>
            {anyo + 1} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          {reporte && (
            <Button size="sm" onClick={() => void handleExportPDF()} disabled={exportando}>
              <Download className="mr-1.5 h-4 w-4" />
              {exportando ? t('common.guardando') : 'PDF'}
            </Button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !reporte ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t('common.sinResultados')}</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reporteAnual.ingresosTotales')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatMoney(reporte.resumen.totalIngresos)}</div>
                <p className="text-xs text-muted-foreground">{reporte.resumen.facturasIngresos} facturas emitidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reporteAnual.gastosTotales')}</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatMoney(reporte.resumen.totalGastos)}</div>
                <p className="text-xs text-muted-foreground">{reporte.resumen.facturasGastos} facturas recibidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IVA neto anual</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reporte.resumen.ivaNeto >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatMoney(Math.abs(reporte.resumen.ivaNeto))}
                </div>
                <p className="text-xs text-muted-foreground">{reporte.resumen.ivaNeto >= 0 ? 'A ingresar' : 'A compensar'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Beneficio neto</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reporte.resumen.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(reporte.resumen.beneficio)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Retenciones IRPF est.: {formatMoney(reporte.retenciones)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* BarChart: Ingresos vs Gastos mensuales */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos vs Gastos mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reporte.meses.filter(m => m.numFacturas > 0).map(m => ({
                        name: m.nombre.slice(0, 3),
                        Ingresos: m.ingresos / 100,
                        Gastos: m.gastos / 100,
                      }))}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toLocaleString('es-ES')}€`} />
                      <Tooltip
                        formatter={(value: number) => formatMoney(value * 100)}
                        contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Ingresos" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Gastos" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* PieChart: Categorías de gasto */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Distribución de gastos por categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {reporte.categorias.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">No hay gastos registrados</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reporte.categorias.map(c => ({
                            name: c.label,
                            value: c.total / 100,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {reporte.categorias.map((c) => {
                            const catDef = CATEGORIAS_GASTO.find(cat => cat.id === c.categoria)
                            return <Cell key={c.categoria} fill={catDef?.color ?? '#6b7280'} />
                          })}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatMoney(value * 100)}
                          contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LineChart: Evolución del beneficio */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evolución mensual del beneficio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={reporte.meses.filter(m => m.numFacturas > 0).map(m => ({
                      name: m.nombre.slice(0, 3),
                      Beneficio: m.beneficio / 100,
                    }))}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toLocaleString('es-ES')}€`} />
                    <Tooltip
                      formatter={(value: number) => formatMoney(value * 100)}
                      contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    />
                    <Line type="monotone" dataKey="Beneficio" stroke="hsl(47, 95%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Resumen general */}
          <Card id="reporte-resumen">
            <CardHeader>
              <CardTitle className="text-lg">{SECTION_LABELS.resumen}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('reporteAnual.totalFacturas')}</p>
                  <p className="text-2xl font-bold mt-1">{reporte.resumen.totalFacturas}</p>
                  <p className="text-xs text-muted-foreground mt-1">{reporte.resumen.facturasIngresos} emitidas · {reporte.resumen.facturasGastos} recibidas</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">IVA repercutido</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.resumen.ivaRepercutido)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">IVA soportado</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.resumen.ivaSoportado)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desglose mensual */}
          <Card id="reporte-meses">
            <CardHeader>
              <CardTitle className="text-lg">{SECTION_LABELS.meses}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Mes</th>
                      <th className="px-3 py-2 text-right">Ingresos</th>
                      <th className="px-3 py-2 text-right">Gastos</th>
                      <th className="px-3 py-2 text-right">Beneficio</th>
                      <th className="px-3 py-2 text-right">IVA Repercutido</th>
                      <th className="px-3 py-2 text-right">IVA Soportado</th>
                      <th className="px-3 py-2 text-center">Facturas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.meses.filter(m => m.numFacturas > 0).map(m => (
                      <tr key={m.mes} className="border-t">
                        <td className="px-3 py-2 font-medium">{m.nombre}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatMoney(m.ingresos)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatMoney(m.gastos)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${m.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatMoney(m.beneficio)}
                        </td>
                        <td className="px-3 py-2 text-right">{formatMoney(m.ivaRepercutido)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(m.ivaSoportado)}</td>
                        <td className="px-3 py-2 text-center">{m.numFacturas}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/50 font-medium">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatMoney(reporte.resumen.totalIngresos)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatMoney(reporte.resumen.totalGastos)}</td>
                      <td className={`px-3 py-2 text-right ${reporte.resumen.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMoney(reporte.resumen.beneficio)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatMoney(reporte.resumen.ivaRepercutido)}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(reporte.resumen.ivaSoportado)}</td>
                      <td className="px-3 py-2 text-center">{reporte.resumen.totalFacturas}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Categorías */}
          <Card id="reporte-categorias">
            <CardHeader>
              <CardTitle className="text-lg">{SECTION_LABELS.categorias}</CardTitle>
            </CardHeader>
            <CardContent>
              {reporte.categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay gastos registrados este año</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Categoría</th>
                        <th className="px-3 py-2 text-right">Importe</th>
                        <th className="px-3 py-2 text-right">% del total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.categorias.map((c, i) => (
                        <tr key={c.categoria} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{c.label}</td>
                          <td className="px-3 py-2 text-right text-red-600">{formatMoney(c.total)}</td>
                          <td className="px-3 py-2 text-right">{formatPct(c.porcentaje)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clientes */}
          <Card id="reporte-clientes">
            <CardHeader>
              <CardTitle className="text-lg">{SECTION_LABELS.clientes}</CardTitle>
            </CardHeader>
            <CardContent>
              {reporte.clientes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay ingresos registrados este año</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Cliente</th>
                        <th className="px-3 py-2 text-right">Total facturado</th>
                        <th className="px-3 py-2 text-center">Nº facturas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.clientes.map((c, i) => (
                        <tr key={c.cliente} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{c.cliente}</td>
                          <td className="px-3 py-2 text-right text-green-600">{formatMoney(c.total)}</td>
                          <td className="px-3 py-2 text-center">{c.numFacturas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* IVA por trimestre */}
          <Card id="reporte-iva">
            <CardHeader>
              <CardTitle className="text-lg">{SECTION_LABELS.iva}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Trimestre</th>
                      <th className="px-3 py-2 text-right">IVA Repercutido</th>
                      <th className="px-3 py-2 text-right">IVA Soportado</th>
                      <th className="px-3 py-2 text-right">IVA Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.ivaPorTrimestre.map(t => (
                      <tr key={t.trimestre} className="border-t">
                        <td className="px-3 py-2 font-medium">T{t.trimestre}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(t.ivaRepercutido)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(t.ivaSoportado)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${t.neto >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatMoney(t.neto)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/50 font-medium">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right">{formatMoney(reporte.resumen.ivaRepercutido)}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(reporte.resumen.ivaSoportado)}</td>
                      <td className={`px-3 py-2 text-right ${reporte.resumen.ivaNeto >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatMoney(reporte.resumen.ivaNeto)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Ratios */}
          <Card id="reporte-ratios">
            <CardHeader>
              <CardTitle className="text-lg">{SECTION_LABELS.ratios}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Margen bruto</p>
                  <p className="text-2xl font-bold mt-1">{formatPct(reporte.ratios.margenBruto)}</p>
                  <p className="text-xs text-muted-foreground mt-1">(Ingresos − Gastos) / Ingresos</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Beneficio neto</p>
                  <p className={`text-2xl font-bold mt-1 ${reporte.resumen.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMoney(reporte.resumen.beneficio)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Gastos fijos</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.ratios.gastosFijos)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatPct(reporte.ratios.gastosFijosPorcentaje)} del total · Alquiler, suministros, nóminas, cuota autónomo</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Gastos variables</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.ratios.gastosVariables)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatPct(10000 - reporte.ratios.gastosFijosPorcentaje)} del total · Marketing, material, transporte, otros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
