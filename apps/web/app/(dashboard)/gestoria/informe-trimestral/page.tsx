'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, TrendingUp, TrendingDown, Calculator } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface Factura {
  fechaEmision: string
  tipo: string
  baseImponible: number
  iva: number
  total: number
  estado: string
  categoriaGasto: string | null
}

interface ResumenTrimestre {
  trimestre: number
  anyo: number
  ingresos: { total: number; base: number; iva: number; count: number }
  gastos: { total: number; base: number; iva: number; count: number }
  ivaNeto: number
  beneficio: number
  retencionesNomina: number
}

export default function InformeTrimestralPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [anyo, setAnyo] = useState(new Date().getFullYear())
  const [trimestreActivo, setTrimestreActivo] = useState(Math.floor(new Date().getMonth() / 3))
  const [cargando, setCargando] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])
  const { t } = useLanguage()

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }
      const { data } = await getSupabase()
        .from('facturas')
        .select('fechaEmision, tipo, baseImponible, iva, total, estado, categoriaGasto')
        .eq('perfilId', user.id)
        .gte('fechaEmision', `${anyo}-01-01`)
        .lt('fechaEmision', `${anyo + 1}-01-01`)
      if (data) setFacturas(data as Factura[])
      setCargando(false)
    }
    cargar()
  }, [getSupabase, anyo])

  const calcularTrimestre = (q: number): ResumenTrimestre => {
    const inicio = new Date(anyo, q * 3, 1)
    const fin = new Date(anyo, (q + 1) * 3, 0)
    const filtradas = facturas.filter(f => {
      const d = new Date(f.fechaEmision)
      return d >= inicio && d <= fin
    })

    const ingresos = filtradas.filter(f => f.tipo === 'ingreso')
    const gastos = filtradas.filter(f => f.tipo === 'gasto')

    const baseIngresos = ingresos.reduce((s, f) => s + f.baseImponible, 0)
    const ivaIngresos = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
    const totalIngresos = ingresos.reduce((s, f) => s + f.total, 0)

    const baseGastos = gastos.reduce((s, f) => s + f.baseImponible, 0)
    const ivaGastos = gastos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
    const totalGastos = gastos.reduce((s, f) => s + f.total, 0)

    return {
      trimestre: q + 1,
      anyo,
      ingresos: { total: totalIngresos, base: baseIngresos, iva: ivaIngresos, count: ingresos.length },
      gastos: { total: totalGastos, base: baseGastos, iva: ivaGastos, count: gastos.length },
      ivaNeto: ivaIngresos - ivaGastos,
      beneficio: totalIngresos - totalGastos,
      retencionesNomina: 0,
    }
  }

  const trimestres = [0, 1, 2, 3].map(q => calcularTrimestre(q))
  const resumen = trimestres[trimestreActivo]!
  const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const exportarPDF = async () => {
    const { generarPDFDeHTML } = await import('@/lib/pdf')
    const html = `
      <div style="font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 4px 0">${t('informeTrimestral.titulo')} Q${resumen.trimestre} ${resumen.anyo}</h1>
        <p style="font-size:12px;color:#6b7280;margin:0 0 24px 0">${t('informeTrimestral.subtitulo')}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:10px;color:#6b7280;margin:0">${t('informeTrimestral.ingresos').toUpperCase()}</p>
            <p style="font-size:18px;font-weight:800;color:#16a34a;margin:4px 0">${formatEuro(resumen.ingresos.total)}</p>
            <p style="font-size:10px;color:#6b7280;margin:0">${resumen.ingresos.count} ${t('informeTrimestral.facturas')}</p>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:10px;color:#6b7280;margin:0">${t('informeTrimestral.gastos').toUpperCase()}</p>
            <p style="font-size:18px;font-weight:800;color:#ef4444;margin:4px 0">${formatEuro(resumen.gastos.total)}</p>
            <p style="font-size:10px;color:#6b7280;margin:0">${resumen.gastos.count} ${t('informeTrimestral.facturas')}</p>
          </div>
          <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:10px;color:#6b7280;margin:0">${t('informeTrimestral.ivaNeto').toUpperCase()}</p>
            <p style="font-size:18px;font-weight:800;color:#2563eb;margin:4px 0">${formatEuro(resumen.ivaNeto)}</p>
            <p style="font-size:10px;color:#6b7280;margin:0">${resumen.ivaNeto >= 0 ? t('informeTrimestral.aIngresarPdf') : t('informeTrimestral.aFavorPdf')}</p>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead><tr style="background:#1a1a1a;color:white">
            <th style="padding:10px 12px;text-align:left;font-size:11px">${t('informeTrimestral.concepto')}</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px">${t('informeTrimestral.base')}</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px">IVA</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px">${t('informeTrimestral.total')}</th>
          </tr></thead>
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 12px;font-size:12px;font-weight:600">${t('informeTrimestral.ingresos')}</td><td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(resumen.ingresos.base)}</td><td style="padding:10px 12px;font-size:12px;text-align:right;color:#16a34a">${formatEuro(resumen.ingresos.iva)}</td><td style="padding:10px 12px;font-size:12px;text-align:right;font-weight:600">${formatEuro(resumen.ingresos.total)}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 12px;font-size:12px;font-weight:600">${t('informeTrimestral.gastos')}</td><td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(resumen.gastos.base)}</td><td style="padding:10px 12px;font-size:12px;text-align:right;color:#ef4444">${formatEuro(resumen.gastos.iva)}</td><td style="padding:10px 12px;font-size:12px;text-align:right;font-weight:600">${formatEuro(resumen.gastos.total)}</td></tr>
          </tbody>
          <tfoot><tr style="background:#f3f4f6;font-weight:700">
            <td style="padding:10px 12px;font-size:12px" colspan="2">${t('informeTrimestral.beneficioNeto')}</td>
            <td style="padding:10px 12px;font-size:12px;text-align:right">IVA: ${formatEuro(resumen.ivaNeto)}</td>
            <td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(resumen.beneficio)}</td>
          </tr></tfoot>
        </table>
        <p style="font-size:9px;color:#9ca3af;text-align:center">${t('informeTrimestral.informeGeneradoPor')}</p>
      </div>`
    await generarPDFDeHTML(html, `informe-trimestral-Q${resumen.trimestre}-${anyo}`, { orientacion: 'landscape' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('informeTrimestral.titulo')}</h1>
          <p className="text-muted-foreground">{t('informeTrimestral.subtitulo')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnyo(y => y - 1)}>{anyo - 1}</Button>
          <span className="text-sm font-medium">{anyo}</span>
          <Button variant="outline" size="sm" onClick={() => setAnyo(y => y + 1)} disabled={anyo >= new Date().getFullYear()}>{anyo + 1}</Button>
        </div>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map(q => (
          <Button key={q} variant={trimestreActivo === q - 1 ? 'default' : 'outline'} size="sm"
            onClick={() => setTrimestreActivo(q - 1)}>
            Q{q}
          </Button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">{t('informeTrimestral.cargandoDatos')}</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" /> {t('informeTrimestral.ingresos')}
                </div>
                <p className="text-2xl font-bold text-green-600">{formatEuro(resumen.ingresos.total)}</p>
                <p className="text-xs text-muted-foreground">{resumen.ingresos.count} {t('informeTrimestral.facturas')} · {t('informeTrimestral.base')}: {formatEuro(resumen.ingresos.base)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" /> {t('informeTrimestral.gastos')}
                </div>
                <p className="text-2xl font-bold text-red-600">{formatEuro(resumen.gastos.total)}</p>
                <p className="text-xs text-muted-foreground">{resumen.gastos.count} {t('informeTrimestral.facturas')} · {t('informeTrimestral.base')}: {formatEuro(resumen.gastos.base)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Calculator className="h-4 w-4 text-blue-600" /> {t('informeTrimestral.ivaNeto')}
                </div>
                <p className={`text-2xl font-bold ${resumen.ivaNeto >= 0 ? 'text-blue-600' : 'text-green-600'}`}>{formatEuro(resumen.ivaNeto)}</p>
                <p className="text-xs text-muted-foreground">{resumen.ivaNeto >= 0 ? t('informeTrimestral.aIngresar') : t('informeTrimestral.aFavor')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <FileText className="h-4 w-4" /> {t('informeTrimestral.beneficio')}
                </div>
                <p className={`text-2xl font-bold ${resumen.beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatEuro(resumen.beneficio)}</p>
                <p className="text-xs text-muted-foreground">{t('informeTrimestral.ingresosMinusGastos')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Button onClick={() => void exportarPDF()} className="w-full">
                <Download className="mr-2 h-4 w-4" /> {t('informeTrimestral.descargarInformePdf')}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
