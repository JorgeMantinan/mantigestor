'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Package, Download, RefreshCw, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calcularModelo303, type ResultadoModelo303 } from '@mantigestor/utils'
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

export function PanelPackTrimestre({ taxYear }: Props) {
  const [trimestre, setTrimestre] = useState<'1' | '2' | '3' | '4'>('3')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ResultadoModelo303 | null>(null)
  const [nIngresos, setNIngresos] = useState(0)
  const [nGastos, setNGastos] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const calcular = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const t = parseInt(trimestre, 10) as 1 | 2 | 3 | 4
      const mesIni = (t - 1) * 3
      const desde = new Date(taxYear, mesIni, 1)
      const hasta = new Date(taxYear, mesIni + 3, 1)

      const { data: facturas } = await supabase
        .from('facturas')
        .select('*')
        .eq('perfilId', user.id)
        .gte('fechaEmision', desde.toISOString().slice(0, 10))
        .lt('fechaEmision', hasta.toISOString().slice(0, 10))

      const arr = (facturas ?? []) as unknown as FacturaFila[]
      const res = calcularModelo303(
        arr.map(f => ({ tipo: f.tipo, importe: f.importe, iva: f.iva, importeIva: f.importeIva, deducible: f.deducible })),
        t
      )
      setResultado(res)
      setNIngresos(arr.filter(f => f.tipo === 'ingreso').length)
      setNGastos(arr.filter(f => f.tipo === 'gasto').length)
    } catch {
      setError('No se pudo cargar las facturas del trimestre.')
    } finally {
      setLoading(false)
    }
  }, [trimestre, taxYear])

  useEffect(() => { void calcular() }, [calcular])

  const exportarCsv = () => {
    if (!resultado) return
    const filas: string[][] = [
      ['Pack liquidación trimestral', `T${trimestre} · ${taxYear}`],
      ['', ''],
      ['IVA REPERCUTIDO 21%', ''],
      ['Base repercutida 21%', formatMoneyCents(resultado.baseImponibleRepercutida)],
      ['Cuota repercutida 21%', formatMoneyCents(resultado.cuotaRepercutida)],
      ['IVA REPERCUTIDO 10%', ''],
      ['Base repercutida 10%', formatMoneyCents(resultado.baseImponibleRepercutida10)],
      ['Cuota repercutida 10%', formatMoneyCents(resultado.cuotaRepercutida10)],
      ['Total IVA repercutido', formatMoneyCents(resultado.totalCuotaRepercutida)],
      ['', ''],
      ['IVA SOPORTADO DEDUCIBLE', ''],
      ['Base soportada', formatMoneyCents(resultado.baseImponibleSoportada)],
      ['Total IVA soportado', formatMoneyCents(resultado.totalCuotaSoportada)],
      ['', ''],
      ['Compensación aplicada', formatMoneyCents(resultado.compensacionAplicada)],
      ['A ingresar', formatMoneyCents(resultado.aIngresar)],
      ['A devolver', formatMoneyCents(resultado.aDevolver)],
      ['A compensar', formatMoneyCents(resultado.aCompensar)],
      ['', ''],
      ['Facturas del trimestre', ''],
      ['Ingresos', String(nIngresos)],
      ['Gastos', String(nGastos)],
    ]
    const csv = '\uFEFF' + filas.map(f => f.map(c => `"${c}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `pack-trimestre-${taxYear}-T${trimestre}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="pdf-pack-trimestre" className="space-y-3">
      <BotonPDF elementId="pdf-pack-trimestre" filename={`pack-trimestre-${taxYear}-T${trimestre}`} />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Pack de liquidación trimestral</CardTitle>
              <CardDescription>
                Consolidado del trimestre: liquidación del IVA (modelo 303), bases por tipo y totales de
                facturas. Ideal para preparar la declaración del trimestre de un vistazo y para el archivo
                de la gestoría.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Trimestre</p>
              <select
                className={selectCls}
                value={trimestre}
                onChange={e => setTrimestre(e.target.value as '1' | '2' | '3' | '4')}
              >
                <option value="1">T1 (ene-mar)</option>
                <option value="2">T2 (abr-jun)</option>
                <option value="3">T3 (jul-sep)</option>
                <option value="4">T4 (oct-dic)</option>
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">IVA repercutido</p>
                  <p className="text-lg font-bold text-green-600">{formatMoneyCents(resultado.totalCuotaRepercutida)}</p>
                  <p className="text-xs text-muted-foreground">{nIngresos} facturas de ingreso</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">IVA soportado deducible</p>
                  <p className="text-lg font-bold text-red-600">{formatMoneyCents(resultado.totalCuotaSoportada)}</p>
                  <p className="text-xs text-muted-foreground">{nGastos} facturas de gasto</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Base repercutida (21+10%)</p>
                  <p className="text-lg font-semibold">{formatMoneyCents(resultado.baseImponibleRepercutida + resultado.baseImponibleRepercutida10)}</p>
                </div>
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Resultado</p>
                  <p className={`text-lg font-bold ${resultado.aIngresar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {resultado.aIngresar > 0
                      ? `${formatMoneyCents(resultado.aIngresar)} a ingresar`
                      : resultado.aDevolver > 0
                        ? `${formatMoneyCents(resultado.aDevolver)} a devolver`
                        : resultado.aCompensar > 0
                          ? `${formatMoneyCents(resultado.aCompensar)} a compensar`
                          : 'Sin resultado'}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t"><td className="px-3 py-2">Base IVA 21%</td><td className="px-3 py-2 text-right">{formatMoneyCents(resultado.baseImponibleRepercutida)}</td></tr>
                    <tr className="border-t"><td className="px-3 py-2">Cuota IVA 21%</td><td className="px-3 py-2 text-right text-green-600">{formatMoneyCents(resultado.cuotaRepercutida)}</td></tr>
                    <tr className="border-t"><td className="px-3 py-2">Base IVA 10%</td><td className="px-3 py-2 text-right">{formatMoneyCents(resultado.baseImponibleRepercutida10)}</td></tr>
                    <tr className="border-t"><td className="px-3 py-2">Cuota IVA 10%</td><td className="px-3 py-2 text-right text-green-600">{formatMoneyCents(resultado.cuotaRepercutida10)}</td></tr>
                    <tr className="border-t"><td className="px-3 py-2">Base soportada</td><td className="px-3 py-2 text-right">{formatMoneyCents(resultado.baseImponibleSoportada)}</td></tr>
                    <tr className="border-t"><td className="px-3 py-2">Cuota soportada</td><td className="px-3 py-2 text-right text-red-600">{formatMoneyCents(resultado.totalCuotaSoportada)}</td></tr>
                    {resultado.compensacionAplicada > 0 && (
                      <tr className="border-t"><td className="px-3 py-2">Compensación aplicada</td><td className="px-3 py-2 text-right text-green-600">−{formatMoneyCents(resultado.compensacionAplicada)}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Importes calculados desde tus facturas de {taxYear}. Los saldos negativos se compensan en
                trimestres posteriores; en el T4 se devuelven. Además del IVA (303), recuerda presentar las
                retenciones (111/115/123) y, si procede, el pago fraccionado (130).
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
