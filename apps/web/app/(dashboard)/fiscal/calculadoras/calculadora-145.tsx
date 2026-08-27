'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Percent, Info } from 'lucide-react'
import { calcularModelo145 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_145 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

export function CalculadoraModelo145() {
  const [bruto, setBruto] = useState('')
  const [pagadores, setPagadores] = useState('1')
  const [hijos, setHijos] = useState('0')
  const [discapacidad, setDiscapacidad] = useState('0')
  const [gastos, setGastos] = useState('')

  const resultado = useMemo(
    () =>
      calcularModelo145({
        salarioBrutoAnual: parseFloat(bruto) || 0,
        numeroPagadores: parseInt(pagadores, 10) || 1,
        hijos: parseInt(hijos, 10) || 0,
        discapacidadPct: parseInt(discapacidad, 10) || 0,
        otrosGastos: gastos.trim() ? parseFloat(gastos) || 0 : undefined,
      }),
    [bruto, pagadores, hijos, discapacidad, gastos]
  )

  const hasData = parseFloat(bruto) > 0

  return (
    <div id="pdf-modelo-145" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-145" filename="modelo-145" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 145 — Datos del trabajador / Retención IRPF</CardTitle>
              <CardDescription>
                Estima el porcentaje de retención de IRPF a aplicar en nómina según tu situación personal
                y familiar, como la empresa determina a partir de la comunicación del modelo 145.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m145-bruto" ayuda={GUIA_MODELO_145.salarioBrutoAnual}>Salario bruto anual (€)</LabelConAyuda>
              <Input id="m145-bruto" type="number" min="0" step="0.01" placeholder="30000" value={bruto} onChange={e => setBruto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m145-pagadores" ayuda={GUIA_MODELO_145.numeroPagadores}>Nº de pagadores</LabelConAyuda>
              <select
                id="m145-pagadores"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={pagadores}
                onChange={e => setPagadores(e.target.value)}
              >
                <option value="1">1 (un solo empleo)</option>
                <option value="2">2 o más</option>
              </select>
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m145-hijos" ayuda={GUIA_MODELO_145.hijos}>Hijos (mín. descendientes)</LabelConAyuda>
              <Input id="m145-hijos" type="number" min="0" step="1" placeholder="0" value={hijos} onChange={e => setHijos(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m145-disc" ayuda={GUIA_MODELO_145.discapacidadPct}>Discapacidad (%)</LabelConAyuda>
              <Input id="m145-disc" type="number" min="0" step="1" placeholder="0" value={discapacidad} onChange={e => setDiscapacidad(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m145-gastos" ayuda={GUIA_MODELO_145.otrosGastos}>Otros gastos (€)</LabelConAyuda>
              <Input id="m145-gastos" type="number" min="0" step="0.01" placeholder="0" value={gastos} onChange={e => setGastos(e.target.value)} />
            </div>
          </div>

          {hasData && (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <dt className="text-xs text-muted-foreground">Tipo de retención</dt>
                  <dd className="text-2xl font-bold text-primary">{resultado.tipoRetencionPct}%</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Retención anual estimada</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.cuotaRetencion)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Cuota SS trabajador</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.cuotaSS)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Base liquidable</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.baseLiquidableRetencion)}</dd>
                </div>
              </dl>

              {resultado.avisos.length > 0 && (
                <div className="space-y-1">
                  {resultado.avisos.map((a) => (
                    <p key={a} className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                      {a}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Introduce tu salario bruto anual para estimar el tipo de retención de IRPF que te aplicarán en nómina.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Estimación orientativa basada en la escala combinada estatal+autonómica general y la reducción del
            art. 20 LIRPF. El importe exacto que aplica tu empresa lo fija el programa de nómina con las tablas
            oficiales; el tipo real puede variar según tu comunidad autónoma.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
