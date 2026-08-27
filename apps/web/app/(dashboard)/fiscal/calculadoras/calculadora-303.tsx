'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Calculator, TrendingDown, TrendingUp, RotateCcw } from 'lucide-react'
import { calcularModelo303 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_303 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'
import type { FacturaFiscalMinima } from '@mantigestor/utils'

const fEuropeo = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

/** Construye facturas sintéticas a partir de base + IVA dados (en euros) para alimentar calcularModelo303 */
function construyeFacturas(
  base21: number, base10: number, base4: number,
  soportada21: number, soportada10: number, soportada4: number
): { ingresos: FacturaFiscalMinima[]; gastos: FacturaFiscalMinima[] } {
  const ingresos: FacturaFiscalMinima[] = []
  if (base21 > 0) ingresos.push({ tipo: 'ingreso', importe: base21, iva: 21, importeIva: base21 * 0.21, deducible: null })
  if (base10 > 0) ingresos.push({ tipo: 'ingreso', importe: base10, iva: 10, importeIva: base10 * 0.10, deducible: null })
  if (base4 > 0) ingresos.push({ tipo: 'ingreso', importe: base4, iva: 4, importeIva: base4 * 0.04, deducible: null })

  const gastos: FacturaFiscalMinima[] = []
  if (soportada21 > 0) gastos.push({ tipo: 'gasto', importe: soportada21, iva: 21, importeIva: soportada21 * 0.21, deducible: true })
  if (soportada10 > 0) gastos.push({ tipo: 'gasto', importe: soportada10, iva: 10, importeIva: soportada10 * 0.10, deducible: true })
  if (soportada4 > 0) gastos.push({ tipo: 'gasto', importe: soportada4, iva: 4, importeIva: soportada4 * 0.04, deducible: true })

  return { ingresos, gastos }
}

interface Props {
  taxYear?: number
}

export function Calculadora303({ taxYear = 2026 }: Props) {
  const [trimestre, setTrimestre] = useState<'1' | '2' | '3' | '4'>('1')
  const [base21, setBase21] = useState('')
  const [base10, setBase10] = useState('')
  const [base4, setBase4] = useState('')
  const [sop21, setSop21] = useState('')
  const [sop10, setSop10] = useState('')
  const [sop4, setSop4] = useState('')
  const [compensacion, setCompensacion] = useState('')

  const resultado = useMemo(() => {
    const { ingresos, gastos } = construyeFacturas(
      parseFloat(base21) || 0,
      parseFloat(base10) || 0,
      parseFloat(base4) || 0,
      parseFloat(sop21) || 0,
      parseFloat(sop10) || 0,
      parseFloat(sop4) || 0
    )
    const facturas = [...ingresos, ...gastos]
    return calcularModelo303(facturas, Number(trimestre) as 1 | 2 | 3 | 4, (parseFloat(compensacion) || 0) * -1)
  }, [base21, base10, base4, sop21, sop10, sop4, compensacion, trimestre])

  const hasData = parseFloat(base21) > 0 || parseFloat(base10) > 0 || parseFloat(base4) > 0 || parseFloat(sop21) > 0 || parseFloat(sop10) > 0 || parseFloat(sop4) > 0

  return (
    <div id="pdf-modelo-303" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-303" filename="modelo-303" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 303 — IVA trimestral {taxYear}</CardTitle>
              <CardDescription>
                Autoliquidación trimestral del IVA: cuota repercutida, cuota soportada y resultado (a ingresar, a compensar o a devolver).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <LabelConAyuda htmlFor="s303-trimestre" ayuda={GUIA_MODELO_303.trimestre}>Trimestre</LabelConAyuda>
            <select
              id="s303-trimestre"
              value={trimestre}
              onChange={e => setTrimestre(e.target.value as '1' | '2' | '3' | '4')}
              className="mt-2 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="1">1T (enero–marzo)</option>
              <option value="2">2T (abril–junio)</option>
              <option value="3">3T (julio–septiembre)</option>
              <option value="4">4T (octubre–diciembre)</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium">IVA repercutido (cobrado en ventas)</p>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="s303-base21" ayuda={GUIA_MODELO_303.baseRepercutida}>Base imponible 21% (€)</LabelConAyuda>
                <Input id="s303-base21" type="number" min="0" step="0.01" placeholder="0.00" value={base21} onChange={e => setBase21(e.target.value)} />
              </div>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="s303-base10">Base imponible 10% (€)</LabelConAyuda>
                <Input id="s303-base10" type="number" min="0" step="0.01" placeholder="0.00" value={base10} onChange={e => setBase10(e.target.value)} />
              </div>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="s303-base4">Base imponible 4% (€)</LabelConAyuda>
                <Input id="s303-base4" type="number" min="0" step="0.01" placeholder="0.00" value={base4} onChange={e => setBase4(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">IVA soportado (pagado en gastos)</p>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="s303-sop21" ayuda={GUIA_MODELO_303.baseSoportada}>Base deducible 21% (€)</LabelConAyuda>
                <Input id="s303-sop21" type="number" min="0" step="0.01" placeholder="0.00" value={sop21} onChange={e => setSop21(e.target.value)} />
              </div>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="s303-sop10">Base deducible 10% (€)</LabelConAyuda>
                <Input id="s303-sop10" type="number" min="0" step="0.01" placeholder="0.00" value={sop10} onChange={e => setSop10(e.target.value)} />
              </div>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="s303-sop4">Base deducible 4% (€)</LabelConAyuda>
                <Input id="s303-sop4" type="number" min="0" step="0.01" placeholder="0.00" value={sop4} onChange={e => setSop4(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="max-w-xs space-y-2">
            <LabelConAyuda htmlFor="s303-comp" ayuda={GUIA_MODELO_303.compensacion}>
              Compensación saldo negativo trimestres anteriores (€)
            </LabelConAyuda>
            <Input id="s303-comp" type="number" min="0" step="0.01" placeholder="0.00" value={compensacion} onChange={e => setCompensacion(e.target.value)} />
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota repercutida (21% + 10% + 4%)</dt>
                <dd className="text-lg font-semibold text-green-600">{fEuropeo(resultado.totalCuotaRepercutida)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota soportada deducible</dt>
                <dd className="text-lg font-semibold text-red-600">{fEuropeo(resultado.totalCuotaSoportada)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Resultado liquidación</dt>
                <dd className="text-lg font-semibold">{fEuropeo(resultado.resultadoLiquidacion)}</dd>
              </div>
              <div
                className={`rounded-lg border p-3 ${
                  resultado.aIngresar > 0
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : resultado.aDevolver > 0 || resultado.aCompensar > 0
                    ? 'border-green-500/50 bg-green-500/5'
                    : ''
                }`}
              >
                <dt className="text-xs text-muted-foreground">
                  {resultado.aIngresar > 0
                    ? 'A ingresar'
                    : resultado.aDevolver > 0
                    ? 'A devolver'
                    : resultado.aCompensar > 0
                    ? 'A compensar'
                    : 'Resultado'}
                </dt>
                <dd
                  className={`text-lg font-bold flex items-center gap-1 ${
                    resultado.aIngresar > 0 ? 'text-amber-600' : resultado.aDevolver > 0 ? 'text-green-600' : ''
                  }`}
                >
                  {resultado.aIngresar > 0 ? (
                    <><TrendingUp className="h-4 w-4" aria-hidden="true" />{fEuropeo(resultado.aIngresar)}</>
                  ) : resultado.aDevolver > 0 ? (
                    <><TrendingDown className="h-4 w-4" aria-hidden="true" />{fEuropeo(resultado.aDevolver)}</>
                  ) : resultado.aCompensar > 0 ? (
                    <><RotateCcw className="h-4 w-4" aria-hidden="true" />{fEuropeo(resultado.aCompensar)}</>
                  ) : (
                    fEuropeo(0)
                  )}
                </dd>
              </div>
            </dl>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4" aria-hidden="true" />
              Introduce las bases de tu trimestre para liquidar el IVA.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Los saldos negativos se compensan con trimestres siguientes del mismo año (art. 84 RIVA). En el 4T el saldo
            negativo se solicita en devolución. Cálculo orientativo: consulta la autoliquidación oficial.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
