'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
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
import { ChartIvaTrimestral } from '@/components/dashboard/chart-iva-trimestral'
import { ChartAlquiler } from '@/components/dashboard/chart-alquiler'
import { ChartEvolucion } from '@/components/dashboard/chart-evolucion'
import { SkeletonDashboard } from '@/components/dashboard/skeleton-dashboard'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
import { CalendarioFiscal } from '@/components/dashboard/calendario-fiscal'
import { ChartCategorias } from '@/components/dashboard/chart-categorias'
import { ChartPresupuesto } from '@/components/dashboard/chart-presupuesto'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { ChartComparativa } from '@/components/dashboard/chart-comparativa'
import { ChartInteranual } from '@/components/dashboard/chart-interanual'
import { ChartPrediccion } from '@/components/dashboard/chart-prediccion'
import { ChartGastosCategoria } from '@/components/dashboard/chart-gastos-categoria'

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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const getSupabase = useCallback(() => createClient(), [])
  const { perfilActivoId, personas, esPropio } = usePersonaActiva()

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
          supabase.from('perfiles').select('nombre').eq('id', perfilId).single(),
          supabase.from('facturas').select('*').eq('perfilId', perfilId)
            .gte('fechaEmision', `${selectedYear}-01-01`).lt('fechaEmision', `${selectedYear + 1}-01-01`)
            .order('fechaEmision', { ascending: false }),
          supabase.from('nominas').select('*').eq('perfilId', perfilId).eq('anyo', selectedYear).order('mes', { ascending: false }),
          supabase.from('propiedades_alquiler').select('*').eq('perfilId', perfilId),
        ])

        if (perfilRes.data?.nombre) setNombre(perfilRes.data.nombre)
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

  const ingresos = facturas.filter(f => f.tipo === 'ingreso')
  const gastos = facturas.filter(f => f.tipo === 'gasto')
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
  const saludo = ahora.getHours() < 14 ? 'Buenos días' : ahora.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches'

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
            Panel de control fiscal
            {!esPropio && ' · Gestionando otra persona'}
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
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/gestoria/facturas/nueva">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Nueva factura <Kbd className="ml-2">Ctrl+N</Kbd>
            </Button>
          </Link>
          <Link href="/fiscal">
            <Button variant="outline" size="sm">
              <Calculator className="mr-1.5 h-4 w-4" /> Calculadoras
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
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoney(totalIngresos)}</div>
            <p className="text-xs text-muted-foreground">{ingresos.length} facturas emitidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
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
            <CardTitle className="text-sm font-medium">IVA neto</CardTitle>
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
            <CardTitle className="text-sm font-medium">Beneficio neto</CardTitle>
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
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendientes.length}</div>
            <p className="text-xs text-muted-foreground">{formatMoney(totalPendientes)} por cobrar/pagar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo vencimiento</CardTitle>
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
        <div className="grid gap-4 md:grid-cols-2" role="region" aria-label="Gráficas del dashboard">
          <ChartIngresosGastos facturas={facturas} />
          <ChartEvolucion facturas={facturas} nominas={nominas} />
          <ChartIvaTrimestral facturas={facturas} />
          <ChartAlquiler ingresos={totalIngresosAlquiler} gastos={totalGastosAlquiler} />
          <ChartCategorias facturas={facturas} />
          <ChartPresupuesto facturas={facturas} />
          <ChartComparativa facturas={facturas} />
          <ChartInteranual facturas={facturas} />
          <ChartPrediccion facturas={facturas} />
          <ChartGastosCategoria facturas={facturas} />
        </div>
      )}

      {/* Contenido principal */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Calendario fiscal */}
        <CalendarioFiscal />

        {/* Actividad reciente */}
        <ActivityFeed />

        {/* Últimas facturas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Últimas facturas</CardTitle>
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
