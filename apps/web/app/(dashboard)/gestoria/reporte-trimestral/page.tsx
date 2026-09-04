'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generarReporteTrimestral, reporteTrimestralCSV, type DatosTrimestre } from '@mantigestor/utils'
import { Download, FileText } from 'lucide-react'
import { toast, Toaster } from 'sonner'

export default function ReporteTrimestralPage() {
  const { perfilActivoId } = usePersonaActiva()
  const [anyo, setAnyo] = useState(new Date().getFullYear())
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4>(Math.ceil((new Date().getMonth() + 1) / 3) as 1 | 2 | 3 | 4)
  const [cargando, setCargando] = useState(false)
  const [datos, setDatos] = useState<DatosTrimestre | null>(null)

  const cargarDatos = async () => {
    setCargando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCargando(false); return }

    const mesInicio = (trimestre - 1) * 3 + 1
    const mesFin = mesInicio + 2
    const fechaInicio = `${anyo}-${String(mesInicio).padStart(2, '0')}-01`
    const fechaFin = `${anyo}-${String(mesFin).padStart(2, '0')}-31`

    const perfilId = perfilActivoId ?? user.id

    // Fetch facturas del trimestre
    const { data: facturas } = await supabase
      .from('facturas')
      .select('tipo, total, iva, baseImponible')
      .eq('perfilId', perfilId)
      .gte('fechaEmision', fechaInicio)
      .lte('fechaEmision', fechaFin)

    const ingresos = (facturas ?? []).filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
    const gastos = (facturas ?? []).filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)
    const ivaRepercutido = (facturas ?? []).filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.iva, 0)
    const ivaSoportado = (facturas ?? []).filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.iva, 0)

    // Fetch nóminas del trimestre (retenciones IRPF)
    const { data: nominas } = await supabase
      .from('nominas')
      .select('irpf, salarioBruto')
      .eq('perfilId', perfilId)
      .gte('anyo', anyo)
      .lte('anyo', anyo)

    const nominasTrimestre = (nominas ?? []).filter(n => {
      const mesNomina = ((n as Record<string, unknown>).mes as number) ?? 0
      return mesNomina >= mesInicio && mesNomina <= mesFin
    })
    const retencionesIRPF = nominasTrimestre.reduce((s, n) => {
      const bruto = ((n as Record<string, unknown>).salarioBruto as number) ?? 0
      const irpf = ((n as Record<string, unknown>).irpf as number) ?? 0
      return s + Math.round(bruto * (irpf / 100))
    }, 0)

    setDatos({
      trimestre,
      anyo,
      ingresos,
      gastos,
      ivaRepercutido,
      ivaSoportado,
      retencionesIRPF,
      pagosFraccionados: 0,
    })
    setCargando(false)
  }

  useEffect(() => { void cargarDatos() }, [anyo, trimestre, perfilActivoId])

  const reporte = useMemo(() => datos ? generarReporteTrimestral(datos) : null, [datos])

  const descargarCSV = () => {
    if (!reporte) return
    const csv = reporteTrimestralCSV(reporte)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-trimestral-Q${trimestre}-${anyo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV descargado')
  }

  const formatEur = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold">Reporte trimestral</h1>
        <p className="text-muted-foreground">Resumen fiscal automático del trimestre</p>
      </div>

      <div className="flex gap-4">
        <select
          value={trimestre}
          onChange={e => setTrimestre(Number(e.target.value) as 1 | 2 | 3 | 4)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value={1}>Q1 (Ene-Mar)</option>
          <option value={2}>Q2 (Abr-Jun)</option>
          <option value={3}>Q3 (Jul-Sep)</option>
          <option value={4}>Q4 (Oct-Dic)</option>
        </select>
        <select
          value={anyo}
          onChange={e => setAnyo(Number(e.target.value))}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {reporte && (
          <Button onClick={descargarCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Descargar CSV
          </Button>
        )}
      </div>

      {cargando ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-muted rounded" />)}
        </div>
      ) : reporte ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{formatEur(reporte.ingresos)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{formatEur(reporte.gastos)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Beneficio neto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reporte.beneficioNeto >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatEur(reporte.beneficioNeto)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">IVA a pagar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatEur(reporte.ivaAPagar)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  IVA Trimestral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>IVA repercutido</span><span>{formatEur(reporte.ivaAPagar + reporte.ivaSoportado)}</span></div>
                <div className="flex justify-between"><span>IVA soportado</span><span className="text-green-500">-{formatEur(reporte.ivaSoportado)}</span></div>
                <div className="flex justify-between border-t pt-2 font-medium"><span>IVA liquidado</span><span>{formatEur(reporte.ivaLiquidado)}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Modelo 130
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Base imponible</span><span>{formatEur(reporte.baseImponible130)}</span></div>
                <div className="flex justify-between"><span>Cuota (20%)</span><span>{formatEur(reporte.cuota130)}</span></div>
                <div className="flex justify-between"><span>Retenciones IRPF nóminas</span><span className="text-green-500">-{formatEur(reporte.retencionesIRPF)}</span></div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Resultando</span>
                  <span>{formatEur(Math.max(0, reporte.cuota130 - reporte.retencionesIRPF))}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay datos para este trimestre.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
