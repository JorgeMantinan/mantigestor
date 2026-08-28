'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, Download, RefreshCw, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calcularPresupuestoAnual, type PresupuestoAnualResultado } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

interface FacturaFila {
  tipo: 'ingreso' | 'gasto'
  importe: number
  importeIva: number
  iva: number
  deducible: boolean | null
  fechaEmision: string
}

const formatMoneyCents = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

interface Props {
  taxYear: number
}

export function PanelPresupuestoAnual({ taxYear }: Props) {
  const [trimestreActual, setTrimestreActual] = useState<'1' | '2' | '3' | '4'>('3')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<PresupuestoAnualResultado | null>(null)

  const calcular = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const desde = `${taxYear}-01-01`
      const hasta = `${taxYear + 1}-01-01`
      const { data: facturas } = await supabase
        .from('facturas')
        .select('*')
        .eq('perfilId', user.id)
        .gte('fechaEmision', desde)
        .lt('fechaEmision', hasta)

      const arr = (facturas ?? []) as unknown as FacturaFila[]
      const porTrimestre: Array<import('@mantigestor/utils').FacturaFiscalMinima[]> = [[], [], [], []]
      for (const f of arr) {
        const mes = new Date(f.fechaEmision).getMonth()
        const tri = Math.min(3, Math.floor(mes / 3))
        porTrimestre[tri]?.push({
          tipo: f.tipo,
          importe: f.importe,
          iva: f.iva,
          importeIva: f.importeIva,
          deducible: f.deducible,
        })
      }

      const res = calcularPresupuestoAnual({
        facturasPorTrimestre: porTrimestre,
        anio: taxYear,
        trimestreActual: parseInt(trimestreActual, 10) as 1 | 2 | 3 | 4,
      })
      setResultado(res)
    } catch {
      setError('No se pudo calcular el presupuesto anual.')
    } finally {
      setLoading(false)
    }
  }, [trimestreActual, taxYear])

  useEffect(() => { void calcular() }, [calcular])

  const exportarCsv = () => {
    if (!resultado) return
    const filas: string[][] = [
      [`Presupuesto fiscal ${taxYear}`, ''],
      ['', ''],
      ['Trimestre', 'Real?', 'Base repercutida', 'IVA', 'Retenciones IRPF', 'Total a pagar'],
      ...resultado.trimestres.map(t => [
        `T${t.trimestre}`,
        t.real ? 'Si' : 'Proyeccion',
        formatMoneyCents(t.baseRepercutida),
        formatMoneyCents(t.cuotaIva),
        formatMoneyCents(t.retencionesIrpf),
        formatMoneyCents(t.totalAPagar),
      ]),
      ['', '', '', '', '', ''],
      ['IVA total', '', '', formatMoneyCents(resultado.totalIva), '', ''],
      ['Retenciones IRPF total', '', '', '', formatMoneyCents(resultado.totalRetencionesIrpf), ''],
      ['TOTAL impuestos', '', '', '', '', formatMoneyCents(resultado.totalImpuestos)],
      ['Ya devengado', '', '', '', '', formatMoneyCents(resultado.devengado)],
      ['Proyectado futuro', '', '', '', '', formatMoneyCents(resultado.proyectado)],
    ]
    const csv = '\uFEFF' + filas.map(f => f.map(c => `"${c}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `presupuesto-fiscal-${taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="pdf-presupuesto-anual" className="space-y-3">
      <BotonPDF elementId="pdf-presupuesto-anual" filename={`presupuesto-fiscal-${taxYear}`} />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Presupuesto fiscal {taxYear}</CardTitle>
              <CardDescription>
                Proyecta tus obligaciones fiscales (IVA + retenciones IRPF) del año segun la tendencia de los
                trimestres ya transcurridos, para anticipar cuanto tendras que pagar.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Trimestre en curso</p>
              <select
                className={selectCls}
                value={trimestreActual}
                onChange={e => setTrimestreActual(e.target.value as '1' | '2' | '3' | '4')}
              >
                <option value="1">T1</option>
                <option value="2">T2</option>
                <option value="3">T3</option>
                <option value="4">T4</option>
              </select>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void calcular()} disabled={loading}>
              {loading ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />}
              Recalcular
            </Button>
            {resultado && (
              <Button type="button" size="sm" variant="outline" onClick={exportarCsv}>
                <Download className="mr-1 h-3 w-3" aria-hidden="true" /> CSV
              </Button>
            )}
          </div>

          {error && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {resultado && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">IVA total del anio</p>
                  <p className="text-lg font-bold text-green-600">{formatMoneyCents(resultado.totalIva)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Retenciones IRPF del anio</p>
                  <p className="text-lg font-semibold">{formatMoneyCents(resultado.totalRetencionesIrpf)}</p>
                </div>
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Total impuestos estimados</p>
                  <p className="text-2xl font-bold text-primary">{formatMoneyCents(resultado.totalImpuestos)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoneyCents(resultado.devengado)} ya devengado · {formatMoneyCents(resultado.proyectado)} proyectado
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Trimestre</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Base repercutida</th>
                      <th className="px-3 py-2 text-right">IVA</th>
                      <th className="px-3 py-2 text-right">Retenciones</th>
                      <th className="px-3 py-2 text-right">Total a pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.trimestres.map(t => (
                      <tr key={t.trimestre} className="border-t">
                        <td className="px-3 py-2 font-medium">T{t.trimestre}</td>
                        <td className="px-3 py-2">{t.real ? 'Real' : <span className="italic text-muted-foreground">Proyeccion</span>}</td>
                        <td className="px-3 py-2 text-right">{formatMoneyCents(t.baseRepercutida)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatMoneyCents(t.cuotaIva)}</td>
                        <td className="px-3 py-2 text-right">{formatMoneyCents(t.retencionesIrpf)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatMoneyCents(t.totalAPagar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {resultado.avisos.length > 0 && (
                <div className="space-y-1">
                  {resultado.avisos.map((a) => (
                    <p key={a} className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                      {a}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Estimacion orientativa basada en tus facturas de {taxYear}. El IVA corresponde al modelo 303 y
                no incluye el pago fraccionado del IRPF (130) ni el IS. Los importes totales sirven para
                planificar en caja, no como declaracion.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}