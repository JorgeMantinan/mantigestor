'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3, Download, Printer } from 'lucide-react'
import { resultadosIvaAnuales, pagosFraccionados130 } from '@mantigestor/utils'
import type { ResultadoModelo303, PagoFraccionadoTrimestre } from '@mantigestor/utils'

const trimestres = [
  { label: 'Q1 (Ene-Mar)', value: 1 },
  { label: 'Q2 (Abr-Jun)', value: 2 },
  { label: 'Q3 (Jul-Sep)', value: 3 },
  { label: 'Q4 (Oct-Dic)', value: 4 },
]

/** Forma de las filas devueltas por la tabla facturas (columnas usadas aquí) */
interface FacturaFila {
  tipo: 'ingreso' | 'gasto'
  importe: number
  importeIva: number
  iva: number
  deducible: boolean | null
  fechaEmision: string
}

interface ResumenAnual {
  resultadosIva: Array<ResultadoModelo303>
  pagos130: Array<PagoFraccionadoTrimestre>
  totalIngresos: number
  totalGastos: number
  numFacturas: number
  retencionesTrimestre: Array<number>
  totalRetenciones: number
}

function indiceTrimestre(fechaEmision: string): number {
  const mes = new Date(fechaEmision).getMonth()
  return Math.min(3, Math.max(0, Math.floor(mes / 3)))
}

export default function TrimestresPage() {
  const anhoActual = new Date().getFullYear()
  const [anho, setAnho] = useState(anhoActual)
  const [selectedTrimestre, setSelectedTrimestre] = useState(
    Math.min(4, Math.ceil((new Date().getMonth() + 1) / 3))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResumenAnual | null>(null)
  const getSupabase = useCallback(() => createClient(), [])

  const calcular = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) throw new Error('No has iniciado sesión')

      // Año completo: el 303 compensa entre trimestres y el 130 es acumulado
      const desde = `${anho}-01-01`
      const hasta = `${anho + 1}-01-01`
      const { data: facturas, error: errFacturas } = await getSupabase()
        .from('facturas')
        .select('*')
        .eq('perfilId', user.id)
        .gte('fechaEmision', desde)
        .lt('fechaEmision', hasta)

      if (errFacturas) throw new Error('Error al consultar las facturas')
      const facturasTipadas = (facturas ?? []) as unknown as FacturaFila[]

      const porTrimestre: Array<FacturaFila[]> = [[], [], [], []]
      for (const f of facturasTipadas) {
        porTrimestre[indiceTrimestre(String(f.fechaEmision))]?.push(f)
      }

      const resultadosIva = resultadosIvaAnuales(porTrimestre)
      const beneficiosPorTrimestre = porTrimestre.map(fs => {
        const ingresos = fs.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.importe, 0)
        const gastosDeducibles = fs
          .filter(f => f.tipo === 'gasto' && f.deducible)
          .reduce((s, f) => s + f.importe, 0)
        return ingresos - gastosDeducibles
      })
      const pagos130 = pagosFraccionados130(beneficiosPorTrimestre)

      // Retenciones IRPF de nóminas (empleado) por trimestre
      const { data: nominasEmp } = await getSupabase()
        .from('nominas')
        .select('salarioBruto, irpf, mes')
        .eq('perfilId', user.id)
        .eq('rol', 'empleado')
        .eq('anyo', anho)

      const retencionesPorTrimestre: [number, number, number, number] = [0, 0, 0, 0]
      if (nominasEmp) {
        for (const n of nominasEmp as unknown as Array<{ salarioBruto: number; irpf: number; mes: number }>) {
          const trimestreIdx = Math.min(3, Math.max(0, Math.floor((n.mes - 1) / 3))) as 0 | 1 | 2 | 3
          retencionesPorTrimestre[trimestreIdx] += Math.round(n.salarioBruto * (n.irpf / 100))
        }
      }
      const totalRetenciones = retencionesPorTrimestre.reduce((s, r) => s + r, 0)

      setResultado({
        resultadosIva,
        pagos130,
        totalIngresos: facturasTipadas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.importe, 0),
        totalGastos: facturasTipadas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.importe, 0),
        numFacturas: facturasTipadas.length,
        retencionesTrimestre: retencionesPorTrimestre,
        totalRetenciones,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado al calcular el trimestre')
      setResultado(null)
    } finally {
      setLoading(false)
    }
  }, [anho, getSupabase])

  useEffect(() => {
    void calcular()
  }, [calcular])

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const res = resultado?.resultadosIva[selectedTrimestre - 1]
  const pago = resultado?.pagos130[selectedTrimestre - 1]

  const exportarCsv = () => {
    if (!resultado) return
    const res = resultado.resultadosIva[selectedTrimestre - 1]
    const pago = resultado.pagos130[selectedTrimestre - 1]
    if (!res || !pago) return
    const filas: Array<[string, string]> = [
      ['Concepto', 'Importe'],
      ['Año', String(anho)],
      ['Trimestre', String(selectedTrimestre)],
      ['Número de facturas (año)', String(resultado.numFacturas)],
      ['Total ingresos (año)', formatMoney(resultado.totalIngresos)],
      ['Total gastos (año)', formatMoney(resultado.totalGastos)],
      ['IVA repercutido (trimestre)', formatMoney(res.totalCuotaRepercutida)],
      ['IVA soportado (trimestre)', formatMoney(res.totalCuotaSoportada)],
      ['Compensación de trimestres anteriores aplicada', formatMoney(res.compensacionAplicada)],
      [
        `Resultado IVA (${res.aDevolver > 0 ? 'devolución' : res.aCompensar > 0 ? 'a compensar' : 'a ingresar'})`,
        formatMoney(res.aDevolver > 0 ? res.aDevolver : res.aCompensar > 0 ? res.aCompensar : res.aIngresar),
      ],
      ['Pago fraccionado IRPF acumulado hasta el trimestre (modelo 130)', formatMoney(pago.cuotaAcumulada)],
      ['Pago fraccionado a ingresar este trimestre (modelo 130)', formatMoney(pago.aIngresar)],
      ['Retenciones IRPF nóminas (trimestre)', formatMoney(resultado.retencionesTrimestre[selectedTrimestre - 1] ?? 0)],
      ['Retenciones IRPF nóminas (acumulado año)', formatMoney(resultado.totalRetenciones)],
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos (año)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{formatMoney(resultado.totalIngresos)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gastos (año)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{formatMoney(resultado.totalGastos)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">IVA repercutido (trimestre)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMoney(res?.totalCuotaRepercutida ?? 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">IVA soportado (trimestre)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMoney(res?.totalCuotaSoportada ?? 0)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resultado del trimestre</CardTitle>
                <CardDescription>
                  Trimestre {selectedTrimestre} — {anho} · {resultado.numFacturas} facturas en el año ·
                  {' '}compensación entre trimestres del mismo año aplicada (Modelo 303)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(res?.compensacionAplicada ?? 0) > 0 && (
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <p className="font-medium">Compensación de trimestres anteriores</p>
                      <p className="text-sm text-muted-foreground">Saldo negativo previo aplicado a este trimestre</p>
                    </div>
                    <span className="text-xl font-bold text-green-600">−{formatMoney(res?.compensacionAplicada ?? 0)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-medium">
                      IVA {res && res.aDevolver > 0 ? 'a devolver' : res && res.aCompensar > 0 ? 'a compensar' : 'a ingresar'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Resultado IVA (Modelo 303){res && res.aCompensar > 0 ? ' · se restará en trimestres siguientes' : res && res.aDevolver > 0 ? ' · el 4T no admite saldo a compensar' : ''}
                    </p>
                  </div>
                  <span className={`text-2xl font-bold ${res && res.aIngresar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatMoney(res ? (res.aDevolver > 0 ? res.aDevolver : res.aCompensar > 0 ? res.aCompensar : res.aIngresar) : 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-medium">Pago fraccionado IRPF a ingresar este trimestre</p>
                    <p className="text-sm text-muted-foreground">
                      Modelo 130 · cuota acumulada del año: {formatMoney(pago?.cuotaAcumulada ?? 0)} − pagos anteriores: {formatMoney(pago?.pagosAnteriores ?? 0)}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{formatMoney(pago?.aIngresar ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Beneficio neto acumulado hasta este trimestre</p>
                    <p className="text-sm text-muted-foreground">Base del pago fraccionado (ingresos − gastos deducibles)</p>
                  </div>
                  <span className={`text-xl font-bold ${(pago?.beneficioAcumulado ?? 0) >= 0 ? '' : 'text-red-600'}`}>
                    {formatMoney(pago?.beneficioAcumulado ?? 0)}
                  </span>
                </div>
                {(resultado.retencionesTrimestre[selectedTrimestre - 1] ?? 0) > 0 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <div>
                      <p className="font-medium">Retenciones IRPF nóminas (empleado)</p>
                      <p className="text-sm text-muted-foreground">Se descuentan de la cuota anual del Modelo 100</p>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {formatMoney(resultado.retencionesTrimestre[selectedTrimestre - 1] ?? 0)}
                    </span>
                  </div>
                )}
                {resultado.totalRetenciones > 0 && (
                  <div className="flex items-center justify-between border-t pt-4 text-sm">
                    <span className="text-muted-foreground">Retenciones acumuladas del año</span>
                    <span className="font-medium text-green-600">{formatMoney(resultado.totalRetenciones)}</span>
                  </div>
                )}
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
