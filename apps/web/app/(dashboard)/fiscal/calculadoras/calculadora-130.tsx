'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Calculator, TrendingUp } from 'lucide-react'
import { calcularModelo130, pagosFraccionados130 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_130 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const fEuropeo = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

interface Props {
  taxYear?: number
  datosIniciales?: { ingresos?: number; gastos?: number; retenciones?: number; pagosAnteriores?: number }
}

export function Calculadora130({ taxYear = 2026, datosIniciales }: Props) {
  const [ingresos, setIngresos] = useState(datosIniciales?.ingresos != null ? String(datosIniciales.ingresos) : '')
  const [gastos, setGastos] = useState(datosIniciales?.gastos != null ? String(datosIniciales.gastos) : '')
  const [pagosAnteriores, setPagosAnteriores] = useState(datosIniciales?.pagosAnteriores != null ? String(datosIniciales.pagosAnteriores) : '')
  const [retenciones, setRetenciones] = useState(datosIniciales?.retenciones != null ? String(datosIniciales.retenciones) : '')

  const [trim1, setTrim1] = useState('')
  const [trim2, setTrim2] = useState('')
  const [trim3, setTrim3] = useState('')
  const [trim4, setTrim4] = useState('')

  const resultado = useMemo(
    () =>
      calcularModelo130(
        parseFloat(ingresos) || 0,
        parseFloat(gastos) || 0,
        parseFloat(pagosAnteriores) || 0,
        parseFloat(retenciones) || 0
      ),
    [ingresos, gastos, pagosAnteriores, retenciones]
  )

  const secuencia = useMemo(() => {
    const beneficios = [trim1, trim2, trim3, trim4].map(v => parseFloat(v) || 0)
    return pagosFraccionados130(beneficios)
  }, [trim1, trim2, trim3, trim4])

  const hasData = parseFloat(ingresos) > 0 || parseFloat(trim1) > 0

  return (
    <div id="pdf-modelo-130" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-130" filename="modelo-130" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 130 — Pago fraccionado IRPF ({taxYear})</CardTitle>
              <CardDescription>
                Pago fraccionado trimestral de autónomos en estimación directa: 20% sobre el rendimiento neto acumulado anual.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="s130-ingresos" ayuda={GUIA_MODELO_130.ingresos}>Ingresos acumulados del año (€)</LabelConAyuda>
              <Input id="s130-ingresos" type="number" min="0" step="0.01" placeholder="0.00" value={ingresos} onChange={e => setIngresos(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="s130-gastos" ayuda={GUIA_MODELO_130.gastos}>Gastos deducibles acumulados (€)</LabelConAyuda>
              <Input id="s130-gastos" type="number" min="0" step="0.01" placeholder="0.00" value={gastos} onChange={e => setGastos(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="s130-pagos" ayuda={GUIA_MODELO_130.pagosAnteriores}>Pagos fraccionados ya ingresados (€)</LabelConAyuda>
              <Input id="s130-pagos" type="number" min="0" step="0.01" placeholder="0.00" value={pagosAnteriores} onChange={e => setPagosAnteriores(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="s130-retenciones">Retenciones de nómina (€)</LabelConAyuda>
              <Input id="s130-retenciones" type="number" min="0" step="0.01" placeholder="0.00" value={retenciones} onChange={e => setRetenciones(e.target.value)} />
            </div>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Rendimiento neto</dt>
                <dd className="text-lg font-semibold">{fEuropeo(resultado.rendimientoNeto)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota íntegra (20%)</dt>
                <dd className="text-lg font-semibold">{fEuropeo(resultado.cuotaIntegra)}</dd>
              </div>
              <div className={`rounded-lg border p-3 ${resultado.aIngresar > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
                <dt className="text-xs text-muted-foreground">{resultado.aIngresar > 0 ? 'A ingresar' : 'Cuota cubierta'}</dt>
                <dd className={`text-lg font-bold flex items-center gap-1 ${resultado.aIngresar > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {resultado.aIngresar > 0 ? (
                    <><TrendingUp className="h-4 w-4" aria-hidden="true" />{fEuropeo(resultado.aIngresar)}</>
                  ) : (
                    fEuropeo(0)
                  )}
                </dd>
              </div>
            </dl>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Secuencia anual por trimestres (beneficio neto de cada trimestre)</p>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <label htmlFor="s130-t1" className="text-xs text-muted-foreground">1T (€)</label>
                <Input id="s130-t1" type="number" step="0.01" placeholder="0.00" value={trim1} onChange={e => setTrim1(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="s130-t2" className="text-xs text-muted-foreground">2T (€)</label>
                <Input id="s130-t2" type="number" step="0.01" placeholder="0.00" value={trim2} onChange={e => setTrim2(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="s130-t3" className="text-xs text-muted-foreground">3T (€)</label>
                <Input id="s130-t3" type="number" step="0.01" placeholder="0.00" value={trim3} onChange={e => setTrim3(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="s130-t4" className="text-xs text-muted-foreground">4T (€)</label>
                <Input id="s130-t4" type="number" step="0.01" placeholder="0.00" value={trim4} onChange={e => setTrim4(e.target.value)} />
              </div>
            </div>

            {secuencia.some(f => f.beneficioAcumulado > 0 || f.aIngresar > 0) && (
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Trimestre</th>
                      <th className="px-3 py-2 text-right font-medium">Beneficio acumulado</th>
                      <th className="px-3 py-2 text-right font-medium">Cuota acumulada (20%)</th>
                      <th className="px-3 py-2 text-right font-medium">A ingresar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secuencia.map(f => (
                      <tr key={f.trimestre} className="border-b">
                        <td className="px-3 py-2 font-medium">{f.trimestre}T</td>
                        <td className="px-3 py-2 text-right">{fEuropeo(f.beneficioAcumulado)}</td>
                        <td className="px-3 py-2 text-right">{fEuropeo(f.cuotaAcumulada)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-600">{fEuropeo(f.aIngresar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              La cuota se calcula sobre el rendimiento neto ACUMULADO del año y se restan los pagos ya ingresados
              (art. 110 LIRPF). Plazos: 20 de abril, 20 de julio, 20 de octubre y 30 de enero del año siguiente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
