'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Download, Mail, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Receipt, PiggyBank, Landmark, Users, Building2, AlertTriangle,
} from 'lucide-react'
import {
  generarReporteAsesoria, exportarReporteAsesoriaPDF,
  type ReporteAsesoria, type FacturaAsesoria, type PerfilDatos,
} from '@/lib/reporte-asesoria'

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const formatPct = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v / 100)

export function ReporteAsesoriaPageClient() {
  const { perfilActivoId } = usePersonaActiva()
  const { t } = useLanguage()
  const [reporte, setReporte] = useState<ReporteAsesoria | null>(null)
  const [anyo, setAnyo] = useState(new Date().getFullYear())
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const getSupabase = useCallback(() => createClient(), [])

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCargando(false); return }

    const perfilId = perfilActivoId ?? user.id

    const [facturasRes, perfilRes] = await Promise.all([
      supabase
        .from('facturas')
        .select('tipo, numero, emisorReceptor, nifContraparte, fechaEmision, baseImponible, iva, total, estado, categoriaGasto')
        .eq('perfilId', perfilId)
        .gte('fechaEmision', `${anyo}-01-01`)
        .lt('fechaEmision', `${anyo + 1}-01-01`)
        .limit(2000),
      supabase
        .from('perfiles')
        .select('nombre, nif, direccion, email')
        .eq('id', perfilId)
        .single(),
    ])

    if (facturasRes.error || !perfilRes.data) {
      setCargando(false)
      return
    }

    const facturas: FacturaAsesoria[] = ((facturasRes.data ?? []) as Record<string, unknown>[]).map(f => ({
      tipo: f.tipo as 'emitida' | 'recibida',
      numero: f.numero as string,
      emisorReceptor: f.emisorReceptor as string,
      nifContraparte: (f.nifContraparte as string) ?? null,
      fechaEmision: f.fechaEmision as string,
      baseImponible: f.baseImponible as number,
      iva: f.iva as number,
      total: f.total as number,
      estado: f.estado as string,
      categoriaGasto: (f.categoriaGasto as string) ?? null,
    }))

    const perfil: PerfilDatos = {
      nombre: (perfilRes.data as Record<string, unknown>).nombre as string | null,
      nif: (perfilRes.data as Record<string, unknown>).nif as string | null,
      direccion: ((perfilRes.data as Record<string, unknown>).direccion as string) ?? null,
      email: ((perfilRes.data as Record<string, unknown>).email as string) ?? null,
    }

    const resultado = generarReporteAsesoria(facturas, anyo, perfil)
    setReporte(resultado)
    setCargando(false)
  }, [getSupabase, perfilActivoId, anyo])

  useEffect(() => { void cargarDatos() }, [cargarDatos])

  const handleExportPDF = async () => {
    if (!reporte) return
    setExportando(true)
    try {
      await exportarReporteAsesoriaPDF(reporte)
    } finally {
      setExportando(false)
    }
  }

  const handleEnviarEmail = async () => {
    if (!reporte) return
    setEnviando(true)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const asunto = `Informe de asesoría fiscal ${reporte.anyo} — ${reporte.cliente.nombre ?? reporte.cliente.nif ?? ''}`
      const cuerpo = `Adjunto el informe de asesoría fiscal del ejercicio ${reporte.anyo}.

Resumen:
- Ingresos totales: ${formatMoney(reporte.resumenFiscal.totalIngresos)}
- Gastos totales: ${formatMoney(reporte.resumenFiscal.totalGastos)}
- Beneficio neto: ${formatMoney(reporte.resumenFiscal.beneficioNeto)}
- IVA neto anual: ${formatMoney(reporte.resumenFiscal.ivaNetoAnual)}
- Retenciones soportadas: ${formatMoney(reporte.resumenFiscal.retencionesSoportadas)}

Modelos presentados: ${reporte.modelosPresentados.filter(m => m.presentado).map(m => m.modelo).join(', ')}
Modelos pendientes: ${reporte.modelosPresentados.filter(m => !m.presentado).map(m => m.modelo).join(', ') || 'Ninguno'}

Generado por MantiGestor`

      const mailtoLink = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
      window.open(mailtoLink, '_blank')
    } finally {
      setEnviando(false)
    }
  }

  const modelosPresentados = reporte?.modelosPresentados.filter(m => m.presentado).length ?? 0
  const modelosPendientes = reporte?.modelosPresentados.filter(m => !m.presentado).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Informe de asesoría</h1>
            <p className="text-muted-foreground">
              Informe fiscal completo para asesoría — Ejercicio {anyo}
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
            <>
              <Button size="sm" onClick={() => void handleExportPDF()} disabled={exportando}>
                <Download className="mr-1.5 h-4 w-4" />
                {exportando ? 'Generando...' : 'Descargar PDF'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleEnviarEmail()} disabled={enviando}>
                <Mail className="mr-1.5 h-4 w-4" />
                {enviando ? 'Abriendo...' : 'Enviar por email'}
              </Button>
            </>
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
        <p className="text-sm text-muted-foreground text-center py-6">No hay datos disponibles</p>
      ) : (
        <>
          {/* Datos del cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                Datos del cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Nombre</p>
                  <p className="text-sm font-medium mt-1">{reporte.cliente.nombre ?? '—'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">NIF/CIF</p>
                  <p className="text-sm font-medium mt-1">{reporte.cliente.nif ?? '—'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Dirección</p>
                  <p className="text-sm font-medium mt-1">{reporte.cliente.direccion ?? '—'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium mt-1">{reporte.cliente.email ?? '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos totales</CardTitle>
                <PiggyBank className="h-4 w-4 text-green-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatMoney(reporte.resumenFiscal.totalIngresos)}</div>
                <p className="text-xs text-muted-foreground">{reporte.resumenFiscal.totalFacturasEmitidas} facturas emitidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos totales</CardTitle>
                <Receipt className="h-4 w-4 text-red-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatMoney(reporte.resumenFiscal.totalGastos)}</div>
                <p className="text-xs text-muted-foreground">{reporte.resumenFiscal.totalFacturasRecibidas} facturas recibidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IVA neto anual</CardTitle>
                <Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reporte.resumenFiscal.ivaNetoAnual >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatMoney(Math.abs(reporte.resumenFiscal.ivaNetoAnual))}
                </div>
                <p className="text-xs text-muted-foreground">{reporte.resumenFiscal.ivaNetoAnual >= 0 ? 'A ingresar' : 'A compensar'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Modelos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600">{modelosPresentados}</span>
                  <span className="text-sm text-muted-foreground">presentados</span>
                  {modelosPendientes > 0 && (
                    <Badge variant="destructive" className="text-xs">{modelosPendientes} pend.</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">de {reporte.modelosPresentados.length} modelos</p>
              </CardContent>
            </Card>
          </div>

          {/* Resumen fiscal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen fiscal del año</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Beneficio neto</p>
                  <p className={`text-2xl font-bold mt-1 ${reporte.resumenFiscal.beneficioNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMoney(reporte.resumenFiscal.beneficioNeto)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">IVA repercutido total</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.resumenFiscal.ivaRepercutidoTotal)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">IVA soportado total</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.resumenFiscal.ivaSoportadoTotal)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Retenciones soportadas</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.resumenFiscal.retencionesSoportadas)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">IRPF retenciones</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.resumenFiscal.irpfRetenciones)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total facturas</p>
                  <p className="text-2xl font-bold mt-1">{reporte.resumenFiscal.totalFacturasEmitidas + reporte.resumenFiscal.totalFacturasRecibidas}</p>
                  <p className="text-xs text-muted-foreground mt-1">{reporte.resumenFiscal.totalFacturasEmitidas} emitidas · {reporte.resumenFiscal.totalFacturasRecibidas} recibidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IVA por trimestre */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">IVA repercutido vs soportado por trimestre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Trimestre</th>
                      <th className="px-3 py-2 text-right">Base Emitidas</th>
                      <th className="px-3 py-2 text-right">Base Recibidas</th>
                      <th className="px-3 py-2 text-right">IVA Repercutido</th>
                      <th className="px-3 py-2 text-right">IVA Soportado</th>
                      <th className="px-3 py-2 text-right">IVA Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.ivaPorTrimestre.map(t => (
                      <tr key={t.trimestre} className="border-t">
                        <td className="px-3 py-2 font-medium">T{t.trimestre}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(t.baseImponibleEmitidas)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(t.baseImponibleRecibidas)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatMoney(t.ivaRepercutido)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatMoney(t.ivaSoportado)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${t.neto >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatMoney(t.neto)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/50 font-medium">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right">{formatMoney(reporte.ivaPorTrimestre.reduce((s, t) => s + t.baseImponibleEmitidas, 0))}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(reporte.ivaPorTrimestre.reduce((s, t) => s + t.baseImponibleRecibidas, 0))}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatMoney(reporte.resumenFiscal.ivaRepercutidoTotal)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatMoney(reporte.resumenFiscal.ivaSoportadoTotal)}</td>
                      <td className={`px-3 py-2 text-right ${reporte.resumenFiscal.ivaNetoAnual >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatMoney(reporte.resumenFiscal.ivaNetoAnual)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Retenciones soportadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Retenciones soportadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total retenciones</p>
                  <p className="text-2xl font-bold mt-1">{formatMoney(reporte.retencionesSoportadas.totalRetenciones)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Facturas con retención</p>
                  <p className="text-2xl font-bold mt-1">{reporte.retencionesSoportadas.numFacturasConRetencion}</p>
                </div>
                {reporte.retencionesSoportadas.detallePorTrimestre.map(d => (
                  <div key={d.trimestre} className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Retenciones T{d.trimestre}</p>
                    <p className="text-lg font-bold mt-1">{formatMoney(d.importe)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Modelos presentados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Modelos fiscales presentados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Modelo</th>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Plazo</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.modelosPresentados.map(m => (
                      <tr key={m.modelo} className="border-t">
                        <td className="px-3 py-2 font-medium">{m.modelo}</td>
                        <td className="px-3 py-2">{m.nombre}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.plazo}</td>
                        <td className="px-3 py-2 text-center">
                          {m.presentado ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Presentado
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" /> Pendiente
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagos fraccionados IRPF */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pagos fraccionados IRPF (Modelo 130)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Trimestre</th>
                      <th className="px-3 py-2 text-right">Base imponible</th>
                      <th className="px-3 py-2 text-right">Cuota (20%)</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.pagosFraccionadosIRPF.map(p => (
                      <tr key={p.trimestre} className="border-t">
                        <td className="px-3 py-2 font-medium">T{p.trimestre}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(p.base)}</td>
                        <td className="px-3 py-2 text-right font-bold">{formatMoney(p.cuota)}</td>
                        <td className="px-3 py-2 text-center">
                          {p.pagado ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Pagado</Badge>
                          ) : (
                            <Badge variant="destructive">Pendiente</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/50 font-medium">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right">{formatMoney(reporte.pagosFraccionadosIRPF.reduce((s, p) => s + p.base, 0))}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(reporte.pagosFraccionadosIRPF.reduce((s, p) => s + p.cuota, 0))}</td>
                      <td className="px-3 py-2 text-center"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Anexo A: Top gastos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anexo A: Top gastos por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {reporte.anexos.topGastos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay gastos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Categoría</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-right">% del total</th>
                        <th className="px-3 py-2 text-center">Facturas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.anexos.topGastos.map((g, i) => (
                        <tr key={g.categoria} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{g.categoria}</td>
                          <td className="px-3 py-2 text-right text-red-600">{formatMoney(g.total)}</td>
                          <td className="px-3 py-2 text-right">{formatPct(g.porcentaje)}</td>
                          <td className="px-3 py-2 text-center">{g.numFacturas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Anexo B: Top clientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anexo B: Top clientes por facturación</CardTitle>
            </CardHeader>
            <CardContent>
              {reporte.anexos.topClientes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay ingresos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Cliente</th>
                        <th className="px-3 py-2 text-left">NIF</th>
                        <th className="px-3 py-2 text-right">Total facturado</th>
                        <th className="px-3 py-2 text-center">Facturas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.anexos.topClientes.map((c, i) => (
                        <tr key={c.cliente} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{c.cliente}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.nif ?? '—'}</td>
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

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground py-4 border-t">
            <p>Documento generado automáticamente por MantiGestor — Revisar antes de presentar a asesoría</p>
          </div>
        </>
      )}
    </div>
  )
}
