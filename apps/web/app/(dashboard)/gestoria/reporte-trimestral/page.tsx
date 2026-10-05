'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generarReporteTrimestral, reporteTrimestralCSV, type DatosTrimestre } from '@mantigestor/utils'
import { Download, FileText } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { generarPDFDeHTML } from '@/lib/pdf'

export default function ReporteTrimestralPage() {
  const { perfilActivoId } = usePersonaActiva()
  const { t } = useLanguage()
  const [anyo, setAnyo] = useState(new Date().getFullYear())
  const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 4>(Math.ceil((new Date().getMonth() + 1) / 3) as 1 | 2 | 3 | 4)
  const [cargando, setCargando] = useState(false)
  const [datos, setDatos] = useState<DatosTrimestre | null>(null)

  const cargarDatos = useCallback(async () => {
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
  }, [anyo, trimestre, perfilActivoId])

  useEffect(() => { void cargarDatos() }, [cargarDatos])

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
    toast.success(t('reporteTrimestral.csvDescargado'))
  }

  const formatEur = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const exportarPDF = async () => {
    if (!reporte) return
    const html = `
      <div style="font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 4px 0">Informe Trimestral — Q${trimestre} ${anyo}</h1>
        <p style="font-size:12px;color:#6b7280;margin:0 0 24px 0">Resumen fiscal del trimestre</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:10px;color:#6b7280;margin:0">INGRESOS</p>
            <p style="font-size:18px;font-weight:800;color:#16a34a;margin:4px 0">${formatEur(reporte.ingresos)}</p>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:10px;color:#6b7280;margin:0">GASTOS</p>
            <p style="font-size:18px;font-weight:800;color:#ef4444;margin:4px 0">${formatEur(reporte.gastos)}</p>
          </div>
          <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:10px;color:#6b7280;margin:0">BENEFICIO NETO</p>
            <p style="font-size:18px;font-weight:800;color:#2563eb;margin:4px 0">${formatEur(reporte.beneficioNeto)}</p>
          </div>
          <div style="background:#fefce8;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:10px;color:#6b7280;margin:0">IVA A PAGAR</p>
            <p style="font-size:18px;font-weight:800;margin:4px 0">${formatEur(reporte.ivaAPagar)}</p>
          </div>
        </div>
        <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0">Liquidación IVA trimestral</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead><tr style="background:#1a1a1a;color:white">
            <th style="padding:10px 12px;text-align:left;font-size:11px">Concepto</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px">Importe</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 12px;font-size:12px">IVA Repercutido</td><td style="padding:10px 12px;font-size:12px;text-align:right">${formatEur(reporte.ivaAPagar + reporte.ivaSoportado)}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 12px;font-size:12px">IVA Soportado</td><td style="padding:10px 12px;font-size:12px;text-align:right;color:#16a34a">-${formatEur(reporte.ivaSoportado)}</td></tr>
            <tr style="background:#f3f4f6;font-weight:700"><td style="padding:10px 12px;font-size:12px">IVA Liquidado</td><td style="padding:10px 12px;font-size:12px;text-align:right">${formatEur(reporte.ivaLiquidado)}</td></tr>
          </tbody>
        </table>
        <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0">Modelo 130</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead><tr style="background:#1a1a1a;color:white">
            <th style="padding:10px 12px;text-align:left;font-size:11px">Concepto</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px">Importe</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 12px;font-size:12px">Base imponible</td><td style="padding:10px 12px;font-size:12px;text-align:right">${formatEur(reporte.baseImponible130)}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 12px;font-size:12px">Cuota</td><td style="padding:10px 12px;font-size:12px;text-align:right">${formatEur(reporte.cuota130)}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 12px;font-size:12px">Retenciones IRPF</td><td style="padding:10px 12px;font-size:12px;text-align:right;color:#16a34a">-${formatEur(reporte.retencionesIRPF)}</td></tr>
            <tr style="background:#f3f4f6;font-weight:700"><td style="padding:10px 12px;font-size:12px">Resultado</td><td style="padding:10px 12px;font-size:12px;text-align:right">${formatEur(Math.max(0, reporte.cuota130 - reporte.retencionesIRPF))}</td></tr>
          </tbody>
        </table>
        <p style="font-size:9px;color:#9ca3af;text-align:center">Informe generado por MantiGestor</p>
      </div>`
    await generarPDFDeHTML(html, `reporte-trimestral-Q${trimestre}-${anyo}`, { orientacion: 'landscape' })
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold">{t('reporteTrimestral.titulo')}</h1>
        <p className="text-muted-foreground">{t('reporteTrimestral.subtitulo')}</p>
      </div>

      <div className="flex gap-4">
        <select
          value={trimestre}
          onChange={e => setTrimestre(Number(e.target.value) as 1 | 2 | 3 | 4)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value={1}>{t('reporteTrimestral.Q1')}</option>
          <option value={2}>{t('reporteTrimestral.Q2')}</option>
          <option value={3}>{t('reporteTrimestral.Q3')}</option>
          <option value={4}>{t('reporteTrimestral.Q4')}</option>
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
          <>
            <Button onClick={descargarCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('reporteTrimestral.descargarCSV')}
            </Button>
            <Button onClick={() => void exportarPDF()} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('reporteTrimestral.ingresos')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{formatEur(reporte.ingresos)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('reporteTrimestral.gastos')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{formatEur(reporte.gastos)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('reporteTrimestral.beneficioNeto')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reporte.beneficioNeto >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatEur(reporte.beneficioNeto)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('reporteTrimestral.ivaAPagar')}</CardTitle>
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
                  {t('reporteTrimestral.ivaTrimestral')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t('reporteTrimestral.ivaRepercutido')}</span><span>{formatEur(reporte.ivaAPagar + reporte.ivaSoportado)}</span></div>
                <div className="flex justify-between"><span>{t('reporteTrimestral.ivaSoportado')}</span><span className="text-green-500">-{formatEur(reporte.ivaSoportado)}</span></div>
                <div className="flex justify-between border-t pt-2 font-medium"><span>{t('reporteTrimestral.ivaLiquidado')}</span><span>{formatEur(reporte.ivaLiquidado)}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('reporteTrimestral.modelo130')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t('reporteTrimestral.baseImponible')}</span><span>{formatEur(reporte.baseImponible130)}</span></div>
                <div className="flex justify-between"><span>{t('reporteTrimestral.cuota')}</span><span>{formatEur(reporte.cuota130)}</span></div>
                <div className="flex justify-between"><span>{t('reporteTrimestral.retencionesIRPF')}</span><span className="text-green-500">-{formatEur(reporte.retencionesIRPF)}</span></div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>{t('reporteTrimestral.resultando')}</span>
                  <span>{formatEur(Math.max(0, reporte.cuota130 - reporte.retencionesIRPF))}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('reporteTrimestral.sinDatos')}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
