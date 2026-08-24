'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3, Download, Printer } from 'lucide-react'
import { calcularModelo303 } from '@mantigestor/utils'
import type { Factura as FacturaType } from '@mantigestor/types'

const trimestres = [
  { label: 'Q1 (Ene-Mar)', value: 1 },
  { label: 'Q2 (Abr-Jun)', value: 2 },
  { label: 'Q3 (Jul-Sep)', value: 3 },
  { label: 'Q4 (Oct-Dic)', value: 4 },
]

interface ResumenTrimestral {
  totalIngresos: number
  totalGastos: number
  pagoIrpf: number
  resultadoLiquidacion: number
  totalCuotaRepercutida: number
  totalCuotaSoportada: number
  numFacturas: number
}

function rangoTrimestre(anho: number, trimestre: number): { desde: string; hasta: string } {
  const mesInicio = (trimestre - 1) * 3 + 1
  const anhoFin = trimestre === 4 ? anho + 1 : anho
  const mesFin = trimestre === 4 ? 1 : trimestre * 3 + 1
  return {
    desde: `${anho}-${String(mesInicio).padStart(2, '0')}-01`,
    hasta: `${anhoFin}-${String(mesFin).padStart(2, '0')}-01`,
  }
}

export default function TrimestresPage() {
  const anhoActual = new Date().getFullYear()
  const [anho, setAnho] = useState(anhoActual)
  const [selectedTrimestre, setSelectedTrimestre] = useState(
    Math.min(4, Math.ceil((new Date().getMonth() + 1) / 3))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResumenTrimestral | null>(null)
  const getSupabase = useCallback(() => createClient(), [])

  const calcular = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) throw new Error('No has iniciado sesión')

      const { desde, hasta } = rangoTrimestre(anho, selectedTrimestre)
      const { data: facturas, error: errFacturas } = await getSupabase()
        .from('facturas')
        .select('*')
        .eq('perfilId', user.id)
        .gte('fechaEmision', desde)
        .lt('fechaEmision', hasta)

      if (errFacturas) throw new Error('Error al consultar las facturas')
      const facturasTipadas = (facturas ?? []) as unknown as FacturaType[]

      const res = calcularModelo303(facturasTipadas, selectedTrimestre as 1 | 2 | 3 | 4)
      const totalIngresos = facturasTipadas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.importe, 0)
      const totalGastos = facturasTipadas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.importe, 0)
      const beneficio = totalIngresos - totalGastos

      setResultado({
        ...res,
        totalIngresos,
        totalGastos,
        pagoIrpf: Math.max(0, Math.round(beneficio * 0.2)),
        numFacturas: facturasTipadas.length,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado al calcular el trimestre')
      setResultado(null)
    } finally {
      setLoading(false)
    }
  }, [anho, selectedTrimestre, getSupabase])

  useEffect(() => {
    void calcular()
  }, [calcular])

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const exportarCsv = () => {
    if (!resultado) return
    const filas: Array<[string, string]> = [
      ['Concepto', 'Importe'],
      ['Año', String(anho)],
      ['Trimestre', String(selectedTrimestre)],
      ['Número de facturas', String(resultado.numFacturas)],
      ['Total ingresos', formatMoney(resultado.totalIngresos)],
      ['Total gastos', formatMoney(resultado.totalGastos)],
      ['Beneficio neto', formatMoney(resultado.totalIngresos - resultado.totalGastos)],
      ['IVA repercutido', formatMoney(resultado.totalCuotaRepercutida)],
      ['IVA soportado', formatMoney(resultado.totalCuotaSoportada)],
      [
        `Resultado IVA (${resultado.resultadoLiquidacion >= 0 ? 'a ingresar' : 'a compensar'})`,
        formatMoney(Math.abs(resultado.resultadoLiquidacion)),
      ],
      ['Pago fraccionado IRPF (modelo 130)', formatMoney(resultado.pagoIrpf)],
    ]
    const csv = '\uFEFF' + filas.map(f => f.map(c => `"${c}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `resumen-trimestre-${selectedTrimestre}-${anho}.csv`
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Trimestres</h1>
        <p className="text-muted-foreground">Resumen del IVA (Modelo 303) y pagos fraccionados</p>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {trimestres.map((t) => (
          <Button
            key={t.value}
            variant={selectedTrimestre === t.value ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedTrimestre(t.value)}
          >
            {t.label}
          </Button>
        ))}
        <select
          aria-label="Año fiscal"
          value={anho}
          onChange={e => setAnho(Number(e.target.value))}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          {[anhoActual, anhoActual - 1, anhoActual - 2].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => void calcular()} disabled={loading} className="ml-auto">
          {loading ? 'Calculando...' : 'Recalcular'}
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      )}

      {resultado && (
        <>
          <div className="print-area space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{formatMoney(resultado.totalIngresos)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gastos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{formatMoney(resultado.totalGastos)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">IVA repercutido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMoney(resultado.totalCuotaRepercutida)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">IVA soportado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMoney(resultado.totalCuotaSoportada)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resultado del trimestre</CardTitle>
                <CardDescription>
                  Trimestre {selectedTrimestre} — {anho} · {resultado.numFacturas} facturas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-medium">IVA a ingresar / compensar</p>
                    <p className="text-sm text-muted-foreground">Resultado IVA (Modelo 303)</p>
                  </div>
                  <span className={`text-2xl font-bold ${resultado.resultadoLiquidacion >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatMoney(Math.abs(resultado.resultadoLiquidacion))}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {resultado.resultadoLiquidacion >= 0 ? 'a ingresar' : 'a compensar'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pago fraccionado IRPF</p>
                    <p className="text-sm text-muted-foreground">Modelo 130 (20% sobre beneficio)</p>
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    {formatMoney(resultado.pagoIrpf)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={exportarCsv}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
              Imprimir
            </Button>
          </div>
        </>
      )}

      {!resultado && !loading && !error && (
        <Card className="print:hidden">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <div className="text-center">
              <p className="font-medium">Sin datos para este periodo</p>
              <p className="text-sm text-muted-foreground">
                No hay facturas registradas en el trimestre seleccionado
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
