'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { useLanguage } from '@/contexts/language-context'
import {
  Receipt, TrendingUp, TrendingDown, PiggyBank, Calendar, Users, Home,
  Plus, FileText, Calculator, ArrowRight, AlertCircle, ChevronLeft, ChevronRight, Clock
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { proximosPlazos, getCalendarioFiscal } from '@mantigestor/utils'
import { Kbd } from '@/components/ui/kbd'
import { ChartIngresosGastos } from '@/components/dashboard/chart-ingresos-gastos'
import { ChartCashflow } from '@/components/dashboard/chart-cashflow'
import { ChartIvaTrimestral } from '@/components/dashboard/chart-iva-trimestral'
import { ChartAlquiler } from '@/components/dashboard/chart-alquiler'
import { ChartEvolucion } from '@/components/dashboard/chart-evolucion'
import { SkeletonDashboard } from '@/components/dashboard/skeleton-dashboard'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
import { CalendarioFiscal } from '@/components/dashboard/calendario-fiscal'
import { ChartComparativa } from '@/components/dashboard/chart-comparativa'
import { useWidgetConfig } from '@/components/dashboard/widget-config'
import { SparkLine } from '@/components/ui/sparkline'
import dynamic from 'next/dynamic'

const ChartCategorias = dynamic(() => import('@/components/dashboard/chart-categorias').then(m => m.ChartCategorias), {
  loading: () => <div className="h-[300px] animate-pulse bg-muted rounded" />,
})
const ChartPresupuesto = dynamic(() => import('@/components/dashboard/chart-presupuesto').then(m => m.ChartPresupuesto), {
  loading: () => <div className="h-[300px] animate-pulse bg-muted rounded" />,
})
const ChartInteranual = dynamic(() => import('@/components/dashboard/chart-interanual').then(m => m.ChartInteranual), {
  loading: () => <div className="h-[300px] animate-pulse bg-muted rounded" />,
})
const ChartPrediccion = dynamic(() => import('@/components/dashboard/chart-prediccion').then(m => m.ChartPrediccion), {
  loading: () => <div className="h-[300px] animate-pulse bg-muted rounded" />,
})
const ChartWaterfall = dynamic(() => import('@/components/dashboard/chart-waterfall').then(m => m.ChartWaterfall), {
  loading: () => <div className="h-[300px] animate-pulse bg-muted rounded" />,
})
const ChartGastosCategoria = dynamic(() => import('@/components/dashboard/chart-gastos-categoria').then(m => m.ChartGastosCategoria), {
  loading: () => <div className="h-[300px] animate-pulse bg-muted rounded" />,
})
const WidgetAlertasIVA = dynamic(() => import('@/components/dashboard/widget-alertas-iva').then(m => m.WidgetAlertasIVA), {
  loading: () => <div className="h-[120px] animate-pulse bg-muted rounded" />,
})
const WidgetComparativa = dynamic(() => import('@/components/dashboard/widget-comparativa').then(m => m.WidgetComparativa), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetTopGastos = dynamic(() => import('@/components/dashboard/widget-top-gastos').then(m => m.WidgetTopGastos), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetActivity = dynamic(() => import('@/components/dashboard/widget-activity').then(m => m.WidgetActivity), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const ChartHeatmap = dynamic(() => import('@/components/dashboard/chart-heatmap').then(m => m.ChartHeatmap), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetPrediccion = dynamic(() => import('@/components/dashboard/widget-prediccion').then(m => m.WidgetPrediccion), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetCobro = dynamic(() => import('@/components/dashboard/widget-cobro').then(m => m.WidgetCobro), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetBenchmarking = dynamic(() => import('@/components/dashboard/widget-benchmarking').then(m => m.WidgetBenchmarking), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetAlertasInteligentes = dynamic(() => import('@/components/dashboard/widget-alertas-inteligentes').then(m => m.WidgetAlertasInteligentes), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetExport = dynamic(() => import('@/components/dashboard/widget-export').then(m => m.WidgetExport), {
  loading: () => <div className="h-[160px] animate-pulse bg-muted rounded" />,
})
const WidgetScoreFiscal = dynamic(() => import('@/components/dashboard/widget-score-fiscal').then(m => m.WidgetScoreFiscal), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetForecasting = dynamic(() => import('@/components/dashboard/widget-forecasting').then(m => m.WidgetForecasting), {
  loading: () => <div className="h-[280px] animate-pulse bg-muted rounded" />,
})
const WidgetClientes = dynamic(() => import('@/components/dashboard/widget-clientes').then(m => m.WidgetClientes), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})
const WidgetComparativaAnual = dynamic(() => import('@/components/dashboard/widget-comparativa-anual').then(m => m.WidgetComparativaAnual), {
  loading: () => <div className="h-[260px] animate-pulse bg-muted rounded" />,
})
const WidgetAlertasCobro = dynamic(() => import('@/components/dashboard/widget-alertas-cobro').then(m => m.WidgetAlertasCobro), {
  loading: () => <div className="h-[200px] animate-pulse bg-muted rounded" />,
})

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  total: number
  iva: number
  fechaEmision: string
  fechaVencimiento: string | null
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  categoriaGasto: string | null
  estado: string
}

interface Nomina {
  id: string
  empleada: string
  mes: number
  anyo: number
  salarioBruto: number
  irpf: number
  neto: number
  rol: 'jefe' | 'empleado'
}

interface Propiedad {
  id: string
  direccion: string
  ingresos: number
}

interface GastoAlquiler {
  id: string
  importe: number
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function DashboardPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [gastosAlquiler, setGastosAlquiler] = useState<GastoAlquiler[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [perfilNif, setPerfilNif] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(0) // 0 = todos
  const getSupabase = useCallback(() => createClient(), [])
  const { perfilActivoId, personas, esPropio } = usePersonaActiva()
  const { t } = useLanguage()
  const { isVisible } = useWidgetConfig()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        let perfilId = user.id
        let mostrarNombre: string | undefined
        if (perfilActivoId) {
          perfilId = perfilActivoId
          const persona = personas.find(p => p.perfilId === perfilActivoId)
          mostrarNombre = persona?.nombre ?? persona?.email ?? undefined
        }

        // Queries en paralelo
        const [perfilRes, facturasRes, nominasRes, propsRes] = await Promise.all([
          supabase.from('perfiles').select('nombre, nif').eq('id', perfilId).single(),
          supabase.from('facturas').select('*').eq('perfilId', perfilId)
            .gte('fechaEmision', `${selectedYear}-01-01`).lt('fechaEmision', `${selectedYear + 1}-01-01`)
            .order('fechaEmision', { ascending: false }),
          supabase.from('nominas').select('*').eq('perfilId', perfilId).eq('anyo', selectedYear).order('mes', { ascending: false }),
          supabase.from('propiedades_alquiler').select('*').eq('perfilId', perfilId),
        ])

        if (perfilRes.data?.nombre) setNombre(perfilRes.data.nombre)
        if (perfilRes.data?.nif) setPerfilNif(perfilRes.data.nif)
        else if (mostrarNombre) setNombre(mostrarNombre)

        if (facturasRes.data) setFacturas(facturasRes.data as Factura[])
        if (nominasRes.data) setNominas(nominasRes.data as Nomina[])

        if (propsRes.data) {
          setPropiedades(propsRes.data as Propiedad[])
          if (propsRes.data.length > 0) {
            const ids = propsRes.data.map(p => p.id)
            const { data: gastosData } = await supabase
              .from('gastos_alquiler').select('*').in('propiedadId', ids)
              .gte('fecha', `${selectedYear}-01-01`).lt('fecha', `${selectedYear + 1}-01-01`)
            if (gastosData) setGastosAlquiler(gastosData as GastoAlquiler[])
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [getSupabase, perfilActivoId, personas, selectedYear])

  const facturasFiltradas = useMemo(() => {
    if (selectedMonth === 0) return facturas
    return facturas.filter(f => {
      const mes = new Date(f.fechaEmision).getMonth() + 1
      return mes === selectedMonth
    })
  }, [facturas, selectedMonth])

  const ingresos = facturasFiltradas.filter(f => f.tipo === 'ingreso')
  const gastos = facturasFiltradas.filter(f => f.tipo === 'gasto')
  const totalIngresos = ingresos.reduce((s, f) => s + f.total, 0)
  const totalGastos = gastos.reduce((s, f) => s + f.total, 0)
  const ivaAingresar = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const ivaSoportado = gastos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const ivaNeto = ivaAingresar - ivaSoportado

  const nominasJefe = nominas.filter(n => n.rol === 'jefe')
  const nominasEmp = nominas.filter(n => n.rol === 'empleado')
  const totalNominasJefe = nominasJefe.reduce((s, n) => s + n.salarioBruto, 0)
  const totalRetencionesEmp = nominasEmp.reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0)

  const totalIngresosAlquiler = propiedades.reduce((s, p) => s + p.ingresos, 0)
  const totalGastosAlquiler = gastosAlquiler.reduce((s, g) => s + g.importe, 0)
  const balanceAlquiler = totalIngresosAlquiler - totalGastosAlquiler

  const beneficio = totalIngresos - totalGastos - totalNominasJefe

  const pendientes = facturas.filter(f => f.estado === 'pendiente')
  const totalPendientes = pendientes.reduce((s, f) => s + f.total, 0)
  const proximoVencimiento = pendientes
    .filter(f => f.fechaVencimiento)
    .sort((a, b) => a.fechaVencimiento!.localeCompare(b.fechaVencimiento!))[0] ?? null

  const ahora = new Date()
  const saludo = ahora.getHours() < 14 ? t('dashboard.buenosDias') : ahora.getHours() < 20 ? t('dashboard.buenasTardes') : t('dashboard.buenasNoches')

  const sparkIngresos = useMemo(() => {
    const meses: number[] = Array.from({ length: 12 }, () => 0)
    facturas.forEach(f => {
      if (f.tipo === 'ingreso') {
        const m = new Date(f.fechaEmision).getMonth()
        meses[m] = (meses[m] ?? 0) + f.total
      }
    })
    return meses.slice(0, ahora.getMonth() + 1)
  }, [facturas])

  const sparkGastos = useMemo(() => {
    const meses: number[] = Array.from({ length: 12 }, () => 0)
    facturas.forEach(f => {
      if (f.tipo === 'gasto') {
        const m = new Date(f.fechaEmision).getMonth()
        meses[m] = (meses[m] ?? 0) + f.total
      }
    })
    return meses.slice(0, ahora.getMonth() + 1)
  }, [facturas])

  return (
    <div className="space-y-6">
      {loading && <SkeletonDashboard />}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {!loading && (
      <>
      {/* Saludo + acciones rápidas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">
            {saludo}{nombre ? `, ${nombre}` : ''}
          </h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitulo')}
            {!esPropio && ` · ${t('dashboard.gestionandoOtraPersona')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setSelectedYear(y => y - 1)} aria-label="Año anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[4rem] text-center">{selectedYear}</span>
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => setSelectedYear(y => y + 1)} aria-label="Año siguiente"
            disabled={selectedYear >= new Date().getFullYear()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-8 rounded border border-input bg-background px-2 text-xs"
            aria-label="Filtrar por mes"
          >
            <option value={0}>Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleDateString('es-ES', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/gestoria/facturas/nueva">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> {t('dashboard.nuevaFactura')} <Kbd className="ml-2">Ctrl+N</Kbd>
            </Button>
          </Link>
          <Link href="/fiscal">
            <Button variant="outline" size="sm">
              <Calculator className="mr-1.5 h-4 w-4" /> {t('dashboard.calculadoras')}
            </Button>
          </Link>
          <Link href="/gestoria/facturas">
            <Button variant="outline" size="sm">
              <FileText className="mr-1.5 h-4 w-4" /> Facturas <Kbd className="ml-2">/</Kbd>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.ingresos')}</CardTitle>
            <div className="flex items-center gap-2">
              <SparkLine data={sparkIngresos} color="#16a34a" />
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoney(totalIngresos)}</div>
            <p className="text-xs text-muted-foreground">{ingresos.length} {t('dashboard.facturasEmitidas')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.gastos')}</CardTitle>
            <div className="flex items-center gap-2">
              <SparkLine data={sparkGastos} color="#ef4444" />
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatMoney(totalGastos + totalNominasJefe)}</div>
            <p className="text-xs text-muted-foreground">
              {gastos.length} facturas{nominasJefe.length > 0 ? ` + ${nominasJefe.length} nóminas` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.ivaNeto')}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${ivaNeto >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatMoney(Math.abs(ivaNeto))}
            </div>
            <p className="text-xs text-muted-foreground">{ivaNeto >= 0 ? 'A ingresar (303)' : 'A compensar'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.beneficio')}</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(beneficio)}
            </div>
            <p className="text-xs text-muted-foreground">Ingresos − gastos − nóminas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.pendientes')}</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendientes.length}</div>
            <p className="text-xs text-muted-foreground">{formatMoney(totalPendientes)} por cobrar/pagar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.proximoVencimiento')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {proximoVencimiento ? (
              <>
                <div className="text-2xl font-bold">
                  {new Date(proximoVencimiento.fechaVencimiento!).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </div>
                <p className="text-xs text-muted-foreground">{proximoVencimiento.emisorReceptor} · {formatMoney(proximoVencimiento.total)}</p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Onboarding (solo si usuario nuevo) */}
      {!loading && facturas.length === 0 && (
        <OnboardingChecklist
          tienePerfil={nombre.length > 0}
          tieneFacturas={facturas.length > 0}
          tieneCalculadoras={false}
        />
      )}

      {/* Gráficas */}
      {!loading && facturas.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2" role="region" aria-label={t('dashboard.graficas')}>
          <ChartIngresosGastos facturas={facturasFiltradas} />
          <ChartCashflow facturas={facturasFiltradas} />
          <ChartEvolucion facturas={facturasFiltradas} nominas={nominas} />
          <ChartIvaTrimestral facturas={facturasFiltradas} />
          <ChartAlquiler ingresos={totalIngresosAlquiler} gastos={totalGastosAlquiler} />
          <ChartCategorias facturas={facturasFiltradas} />
          <ChartPresupuesto facturas={facturasFiltradas} />
          <ChartComparativa facturas={facturasFiltradas} />
          <ChartInteranual facturas={facturasFiltradas} />
          <ChartPrediccion facturas={facturasFiltradas} />
          <ChartGastosCategoria facturas={facturasFiltradas} />
          {isVisible('chart-waterfall') && <ChartWaterfall facturas={facturasFiltradas} />}
        </div>
      )}

      {/* Widgets adicionales */}
      {!loading && facturas.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isVisible('alertas-iva') && <WidgetAlertasIVA facturas={facturasFiltradas} />}
          {isVisible('heatmap') && <ChartHeatmap facturas={facturasFiltradas} />}
          {isVisible('comparativa-sector') && <WidgetComparativa facturas={facturasFiltradas} />}
          {isVisible('top-gastos') && <WidgetTopGastos facturas={facturasFiltradas} />}
          {isVisible('prediccion') && <WidgetPrediccion facturas={facturasFiltradas} />}
          {isVisible('cobro') && <WidgetCobro facturas={facturasFiltradas} />}
          {isVisible('benchmarking') && <WidgetBenchmarking facturas={facturasFiltradas} />}
          {isVisible('alertas-inteligentes') && <WidgetAlertasInteligentes facturas={facturasFiltradas} />}
          {isVisible('exportar') && <WidgetExport />}
          {isVisible('score-fiscal') && (
            <WidgetScoreFiscal
              facturas={facturasFiltradas}
              perfil={{ nif: perfilNif }}
            />
          )}
          {isVisible('forecasting') && <WidgetForecasting facturas={facturasFiltradas} />}
          {isVisible('clientes') && <WidgetClientes facturas={facturasFiltradas} />}
          {isVisible('comparativa-anual') && <WidgetComparativaAnual facturas={facturasFiltradas} />}
          {isVisible('alertas-cobro') && <WidgetAlertasCobro facturas={facturasFiltradas} />}
        </div>
      )}

      {/* Contenido principal */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Calendario fiscal */}
        <CalendarioFiscal />

        {/* Actividad reciente */}
        {isVisible('actividad') && <WidgetActivity />}

        {/* Últimas facturas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('dashboard.ultimasFacturas')}</CardTitle>
              <Link href="/gestoria/facturas">
                <Button variant="ghost" size="sm">Ver todas <ArrowRight className="ml-1 h-3 w-3" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
            ) : facturas.length === 0 ? (
              <div className="text-center py-6">
                <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Aún no has añadido ninguna factura.</p>
                <Link href="/gestoria/facturas/nueva">
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="mr-1 h-3 w-3" /> Añadir primera factura
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {facturas.slice(0, 6).map(f => (
                  <Link
                    key={f.id}
                    href={`/gestoria/facturas/${f.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${f.tipo === 'ingreso' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                        {f.tipo === 'ingreso' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.emisorReceptor}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.numero} · {new Date(f.fechaEmision).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${f.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {f.tipo === 'ingreso' ? '+' : '-'}{formatMoney(f.total)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna derecha */}
        <div className="space-y-4">
          {/* Nóminas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Nóminas</CardTitle>
                </div>
                <Link href="/nominas">
                  <Button variant="ghost" size="sm">Ver <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {nominas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Añade nóminas para gestionar retenciones IRPF.
                </p>
              ) : (
                <div className="space-y-2">
                  {nominasJefe.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-muted-foreground">Gasto deducible</span>
                      <span className="text-sm font-medium text-red-600">{formatMoney(totalNominasJefe)}</span>
                    </div>
                  )}
                  {nominasEmp.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm text-muted-foreground">IRPF retenido</span>
                      <span className="text-sm font-medium text-green-600">{formatMoney(totalRetencionesEmp)}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground pt-1">
                    {nominas.length} nóminas en {ahora.getFullYear()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alquiler */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Alquileres</CardTitle>
                </div>
                <Link href="/alquiler">
                  <Button variant="ghost" size="sm">Ver <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {propiedades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Registra propiedades en alquiler.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">Ingresos</span>
                    <span className="text-sm font-medium text-green-600">{formatMoney(totalIngresosAlquiler)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">Gastos</span>
                    <span className="text-sm font-medium text-red-600">{formatMoney(totalGastosAlquiler)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                    <span className="text-sm font-medium">Balance</span>
                    <span className={`text-sm font-bold ${balanceAlquiler >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMoney(balanceAlquiler)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vencimientos fiscales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Próximos vencimientos fiscales</CardTitle>
            </div>
            <Link href="/fiscal">
              <Button variant="ghost" size="sm">Calendario <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarioFiscalDashboard />
        </CardContent>
      </Card>
      </>
      )}
    </div>
  )
}

function CalendarioFiscalDashboard() {
  const calendario = getCalendarioFiscal(new Date().getFullYear())
  const plazosRaw = calendario.map(f => ({
    modeloNumero: f.modelo,
    periodo: f.descripcion,
    fechaLimiteReferencia: f.fechaLimite,
  }))
  const plazos = proximosPlazos(plazosRaw, new Date(), 45)

  if (plazos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No hay vencimientos próximos en los próximos 45 días.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {plazos.slice(0, 5).map(p => (
        <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">
              Modelo {p.modeloNumero?.replace(/^MOD/, '') ?? '—'} · {p.periodo}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.fechaLimiteReferencia.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              p.diasRestantes <= 7
                ? 'bg-destructive/10 text-destructive'
                : p.diasRestantes <= 15
                  ? 'bg-yellow-500/10 text-yellow-700'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {p.diasRestantes} días
          </span>
        </li>
      ))}
    </ul>
  )
}
