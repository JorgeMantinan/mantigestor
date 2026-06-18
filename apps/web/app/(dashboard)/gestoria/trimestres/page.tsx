'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3, Download } from 'lucide-react'
import { calcularModelo303 } from '@mantigestor/utils'
import type { Factura as FacturaType } from '@mantigestor/types'

const trimestres = [
  { label: 'Q1 (Ene-Mar)', value: 1 },
  { label: 'Q2 (Abr-Jun)', value: 2 },
  { label: 'Q3 (Jul-Sep)', value: 3 },
  { label: 'Q4 (Oct-Dic)', value: 4 },
]

export default function TrimestresPage() {
  const [selectedTrimestre, setSelectedTrimestre] = useState(new Date().getMonth() < 3 ? 1 : Math.ceil((new Date().getMonth() + 1) / 3))
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<(ReturnType<typeof calcularModelo303> & { totalIngresos: number; totalGastos: number; pagoIrpf: number }) | null>(null)
  const getSupabase = useCallback(() => createClient(), [])

  const calcular = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setLoading(false); return }

    const year = new Date().getFullYear()
    const { data: facturas } = await getSupabase()
      .from('facturas')
      .select('*')
      .eq('perfilId', user.id)
      .gte('fechaEmision', `${year}-${String((selectedTrimestre - 1) * 3 + 1).padStart(2, '0')}-01`)
      .lt('fechaEmision', `${year}-${String(selectedTrimestre * 3 + 1).padStart(2, '0')}-01`)

    if (facturas) {
      const facturasTipadas = facturas as unknown as FacturaType[]
      const res = calcularModelo303(facturasTipadas, selectedTrimestre as 1 | 2 | 3 | 4)
      const totalIngresos = facturasTipadas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.importe, 0)
      const totalGastos = facturasTipadas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.importe, 0)
      const beneficio = totalIngresos - totalGastos
      const pagoIrpf = Math.max(0, Math.round(beneficio * 0.2))

      setResultado({
        ...res,
        totalIngresos,
        totalGastos,
        pagoIrpf,
      })
    }
    setLoading(false)
  }, [selectedTrimestre, getSupabase])

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Trimestres</h1>
        <p className="text-muted-foreground">Resumen del IVA (Modelo 303) y pagos fraccionados</p>
      </div>

      <div className="flex flex-wrap gap-2">
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
        <Button size="sm" onClick={calcular} disabled={loading} className="ml-auto">
          {loading ? 'Calculando...' : 'Calcular'}
        </Button>
      </div>

      {resultado && (
        <>
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
                Trimestre {selectedTrimestre} — {new Date().getFullYear()}
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
              <div className="pt-4">
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar resumen
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!resultado && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Selecciona un trimestre</p>
              <p className="text-sm text-muted-foreground">
                Elige el trimestre y haz clic en &quot;Calcular&quot; para ver el resumen fiscal
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
