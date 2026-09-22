'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, BarChart3, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { resultadosIvaAnuales, calcularModelo390, type ResultadoModelo303 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'
import { GUIA_MODELO_390 } from '@/lib/fiscal/guia-fiscal'

interface FacturaFila {
  tipo: 'ingreso' | 'gasto'
  baseImponible: number
  importeIva: number
  iva: number
  deducible: boolean | null
  fechaEmision: string
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

interface Props {
  taxYear: number
}

export function Calculadora390({ taxYear }: Props) {
  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState<ResultadoModelo303[] | null>(null)
  const [totalIngresos, setTotalIngresos] = useState(0)
  const [totalGastos, setTotalGastos] = useState(0)
  const [numFacturas, setNumFacturas] = useState(0)

  const calcular = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('userId', user.id)
        .single()
      if (!perfil) return
      const perfilId = perfil.id

      const desde = `${taxYear}-01-01`
      const hasta = `${taxYear + 1}-01-01`
      const { data: facturas } = await supabase
        .from('facturas')
        .select('*')
        .eq('perfilId', perfilId)
        .gte('fechaEmision', desde)
        .lt('fechaEmision', hasta)

      const arr = (facturas ?? []) as unknown as FacturaFila[]
      const porTrimestre: FacturaFila[][] = [[], [], [], []]
      for (const f of arr) {
        const mes = new Date(f.fechaEmision).getMonth()
        const tri = Math.min(3, Math.floor(mes / 3))
        porTrimestre[tri]?.push(f)
      }

      const res = resultadosIvaAnuales(porTrimestre.map(tri => tri.map(f => ({
        tipo: f.tipo,
        importe: f.baseImponible / 100,
        importeIva: f.importeIva,
        iva: f.iva,
        deducible: f.deducible,
      }))))
      setResultados(res)
      setTotalIngresos(arr.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.baseImponible / 100, 0))
      setTotalGastos(arr.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.baseImponible / 100, 0))
      setNumFacturas(arr.length)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [taxYear])

  // Auto-calc on mount
  useEffect(() => { void calcular() }, [calcular])

  const resumen = resultados ? calcularModelo390(resultados) : null
  const totalRepercutido = resumen?.totalCuotaRepercutida ?? 0
  const totalSoportado = resumen?.totalCuotaSoportada ?? 0
  const totalResultado = resumen?.resultadoNeto ?? 0
  const totalCompensaciones = resumen?.totalCompensaciones ?? 0

  const exportarCsv = () => {
    if (!resultados) return
    const filas: string[][] = [
      ['Concepto', 'Q1', 'Q2', 'Q3', 'Q4'],
      ['Base repercutida 21%', ...resultados.map(r => formatMoney(r.baseImponibleRepercutida))],
      ['Cuota repercutida 21%', ...resultados.map(r => formatMoney(r.cuotaRepercutida))],
      ['Base repercutida 10%', ...resultados.map(r => formatMoney(r.baseImponibleRepercutida10))],
      ['Cuota repercutida 10%', ...resultados.map(r => formatMoney(r.cuotaRepercutida10))],
      ['Total cuota repercutida', ...resultados.map(r => formatMoney(r.totalCuotaRepercutida))],
      ['Base soportada', ...resultados.map(r => formatMoney(r.baseImponibleSoportada))],
      ['Total cuota soportada', ...resultados.map(r => formatMoney(r.totalCuotaSoportada))],
      ['Compensación aplicada', ...resultados.map(r => formatMoney(r.compensacionAplicada))],
      ['A ingresar', ...resultados.map(r => formatMoney(r.aIngresar))],
      ['A devolver', ...resultados.map(r => formatMoney(r.aDevolver))],
      ['A compensar', ...resultados.map(r => formatMoney(r.aCompensar))],
      ['RESUMEN ANUAL', '', '', '', ''],
      ['Total IVA repercutido', formatMoney(totalRepercutido)],
      ['Total IVA soportado', formatMoney(totalSoportado)],
      ['Compensaciones aplicadas', formatMoney(totalCompensaciones)],
      ['Resultado neto IVA', formatMoney(totalResultado)],
    ]
    const csv = '\uFEFF' + filas.map(f => f.map(c => `"${c}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `modelo-390-${taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="pdf-modelo-390" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-390" filename="modelo-390" />
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Modelo 390 — Resumen anual IVA {taxYear}</CardTitle>
            <CardDescription>
              Resumen de las liquidaciones trimestrales del IVA (Modelo 303). Presentación: enero del año siguiente.
            </CardDescription>
            {GUIA_MODELO_390.resumen && (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                {GUIA_MODELO_390.resumen.contenido}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void calcular()} disabled={loading}>
              <BarChart3 className="mr-1 h-3 w-3" aria-hidden="true" />
              {loading ? 'Calculando...' : 'Recalcular'}
            </Button>
            {resultados && (
              <Button type="button" size="sm" variant="outline" onClick={exportarCsv}>
                <Download className="mr-1 h-3 w-3" aria-hidden="true" />
                CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {resultados && (
          <>
            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">IVA repercutido (cobrado)</p>
                <p className="text-lg font-bold text-green-600">{formatMoney(totalRepercutido)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">IVA soportado (pagado)</p>
                <p className="text-lg font-bold text-red-600">{formatMoney(totalSoportado)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Compensaciones aplicadas</p>
                <p className="text-lg font-semibold">{formatMoney(totalCompensaciones)}</p>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Resultado neto IVA</p>
                <p className={`text-lg font-bold ${totalResultado >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatMoney(Math.abs(totalResultado))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalResultado >= 0 ? 'A ingresar en el año' : 'A devolver / compensar'}
                </p>
              </div>
            </div>

            {/* Quarterly breakdown table */}
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Concepto</th>
                    <th className="px-3 py-2 text-right font-medium">Q1</th>
                    <th className="px-3 py-2 text-right font-medium">Q2</th>
                    <th className="px-3 py-2 text-right font-medium">Q3</th>
                    <th className="px-3 py-2 text-right font-medium">Q4</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">Base imponible repercutida</td>
                    {resultados.map((r, i) => (
                      <td key={i} className="px-3 py-2 text-right">{formatMoney(r.baseImponibleRepercutida + r.baseImponibleRepercutida10)}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(totalIngresos)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2">Cuota IVA repercutida</td>
                    {resultados.map((r, i) => (
                      <td key={i} className="px-3 py-2 text-right text-green-600">{formatMoney(r.totalCuotaRepercutida)}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium text-green-600">{formatMoney(totalRepercutido)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2">Base imponible soportada</td>
                    {resultados.map((r, i) => (
                      <td key={i} className="px-3 py-2 text-right">{formatMoney(r.baseImponibleSoportada)}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(totalGastos)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2">Cuota IVA soportada</td>
                    {resultados.map((r, i) => (
                      <td key={i} className="px-3 py-2 text-right text-red-600">{formatMoney(r.totalCuotaSoportada)}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium text-red-600">{formatMoney(totalSoportado)}</td>
                  </tr>
                  <tr className="border-b bg-muted/30">
                    <td className="px-3 py-2 font-medium">Compensación trimestres anteriores</td>
                    {resultados.map((r, i) => (
                      <td key={i} className="px-3 py-2 text-right text-green-600">{r.compensacionAplicada > 0 ? `−${formatMoney(r.compensacionAplicada)}` : '—'}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(totalCompensaciones)}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-3 py-2 font-bold">Resultado</td>
                    {resultados.map((r, i) => (
                      <td key={i} className={`px-3 py-2 text-right font-bold ${r.aIngresar > 0 ? 'text-red-600' : r.aDevolver > 0 ? 'text-green-600' : ''}`}>
                        {r.aIngresar > 0 ? formatMoney(r.aIngresar) : r.aDevolver > 0 ? `−${formatMoney(r.aDevolver)}` : r.aCompensar > 0 ? `${formatMoney(r.aCompensar)} ↻` : '0 €'}
                      </td>
                    ))}
                    <td className={`px-3 py-2 text-right font-bold ${totalResultado >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatMoney(Math.abs(totalResultado))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {numFacturas} facturas en {taxYear}. Los saldos negativos se compensan entre trimestres del mismo año.
              En Q4 el saldo negativo se devuelve (no queda pendiente).
            </p>
          </>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
