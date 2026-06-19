'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Landmark, Download, ExternalLink } from 'lucide-react'
import { calcularModelo130 } from '@mantigestor/utils'
import type { Factura as FacturaType } from '@mantigestor/types'

export default function RentaPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ReturnType<typeof calcularModelo130> | null>(null)
  const getSupabase = useCallback(() => createClient(), [])

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const calcular = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: facturas } = await getSupabase()
      .from('facturas')
      .select('*')
      .eq('perfilId', user.id)
      .gte('fechaEmision', `${selectedYear}-01-01`)
      .lt('fechaEmision', `${selectedYear + 1}-01-01`)

    if (facturas) {
      const tipadas = facturas as unknown as FacturaType[]
      const ingresos = tipadas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.importe, 0)
      const gastos = tipadas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.importe, 0)

      const res = calcularModelo130(ingresos, gastos, 0)
      setResultado(res)
    }
    setLoading(false)
  }, [selectedYear, getSupabase])

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Declaración de la Renta</h1>
        <p className="text-muted-foreground">Resumen anual del IRPF (Modelo 100) y pagos fraccionados</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <Button
            key={y}
            variant={selectedYear === y ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedYear(y)}
          >
            {y}
          </Button>
        ))}
        <Button size="sm" onClick={calcular} disabled={loading} className="ml-auto">
          {loading ? 'Calculando...' : 'Calcular'}
        </Button>
      </div>

      {resultado && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatMoney(resultado.ingresosAcumuladosAño)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gastos deducibles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatMoney(resultado.gastosDeduciblesAcumulados)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rendimiento neto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatMoney(resultado.rendimientoNeto)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resultado IRPF — {selectedYear}</CardTitle>
              <CardDescription>
                Cálculo orientativo basado en tus facturas registradas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium">Cuota íntegra</p>
                  <p className="text-sm text-muted-foreground">{resultado.porcentajeRetencion}% sobre rendimiento neto</p>
                </div>
                <span className="text-2xl font-bold">{formatMoney(resultado.cuotaIntegra)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium">Retenciones de nómina</p>
                  <p className="text-sm text-muted-foreground">IRPF retenido por pagadores</p>
                </div>
                <span className="text-2xl font-bold text-green-600">{formatMoney(resultado.retencionesNomina)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Resultado a ingresar</p>
                  <p className="text-sm text-muted-foreground">Declaración de la Renta anual</p>
                </div>
                <span className={`text-2xl font-bold ${resultado.aIngresar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {resultado.aIngresar > 0 ? formatMoney(resultado.aIngresar) : '0 €'}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {resultado.aIngresar > 0 ? 'a pagar' : 'sin importe'}
                  </span>
                </span>
              </div>
              {resultado.sinActividad && (
                <p className="text-sm text-muted-foreground mt-2">
                  No se ha registrado actividad suficiente para el período seleccionado.
                </p>
              )}
              <div className="pt-4 flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar resumen
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href="https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Agencia Tributaria
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!resultado && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Landmark className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Selecciona un año fiscal</p>
              <p className="text-sm text-muted-foreground">
                Elige el año y haz clic en &quot;Calcular&quot; para ver una estimación de tu IRPF anual
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
