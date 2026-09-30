'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Calculator, TrendingDown, TrendingUp } from 'lucide-react'
import { calcularModelo100 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_100 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'
import { eur } from './types'

const eurosACentimos = (v: string): number => Math.round((parseFloat(v) || 0) * 100)

type EscalaTramos = Array<{ desde: number; hasta: number | null; tipo: number }>

export function CalculadoraModelo100(
  {
    datosIniciales,
    escalaEstatal,
    escalaAutonomica,
  }: {
    datosIniciales?: { baseGeneral?: number; pagosFraccionados?: number }
    escalaEstatal?: EscalaTramos
    escalaAutonomica?: EscalaTramos | null
  } = {}
) {
  const [baseGeneral, setBaseGeneral] = useState(datosIniciales?.baseGeneral != null ? String(datosIniciales.baseGeneral) : '')
  const [baseAhorro, setBaseAhorro] = useState('')
  const [reduccionTrabajo, setReduccionTrabajo] = useState('')
  const [reduccionAhorro, setReduccionAhorro] = useState('')
  const [minimoPersonal, setMinimoPersonal] = useState('')
  const [deduccionesAutonomicas, setDeduccionesAutonomicas] = useState('')
  const [pagosFraccionados, setPagosFraccionados] = useState(datosIniciales?.pagosFraccionados != null ? String(datosIniciales.pagosFraccionados) : '')
  const [retenciones, setRetenciones] = useState('')
  const [dividendosIRPF, setDividendosIRPF] = useState('')

  const resultado = useMemo(() =>
    calcularModelo100({
      escalaEstatal,
      escalaAutonomica,
      baseImponibleGeneral: eurosACentimos(baseGeneral),
      baseImponibleAhorro: eurosACentimos(baseAhorro),
      reduccionTrabajo: eurosACentimos(reduccionTrabajo),
      reduccionAhorro: eurosACentimos(reduccionAhorro),
      minimoPersonalFamiliar: eurosACentimos(minimoPersonal),
      deduccionesAutonomicas: eurosACentimos(deduccionesAutonomicas),
      pagosFraccionados: eurosACentimos(pagosFraccionados),
      retenciones: eurosACentimos(retenciones),
      dividendosIRPF: eurosACentimos(dividendosIRPF),
    }),
    [escalaEstatal, escalaAutonomica, baseGeneral, baseAhorro, reduccionTrabajo, reduccionAhorro, minimoPersonal, deduccionesAutonomicas, pagosFraccionados, retenciones, dividendosIRPF]
  )

  const hasData = parseFloat(baseGeneral) > 0 || parseFloat(baseAhorro) > 0

  return (
    <div id="pdf-modelo-100" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-100" filename="modelo-100" />
      <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>Modelo 100 — Declaración de la Renta</CardTitle>
            <CardDescription>
              Cálculo orientativo del IRPF anual: cuota íntegra, deducción DA 61ª y cuota líquida.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium">Rentas y reducciones</p>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-base-general" ayuda={GUIA_MODELO_100.baseImponible}>Base imponible general (€)</LabelConAyuda>
              <Input id="m100-base-general" type="number" min="0" step="0.01" placeholder="25000" value={baseGeneral} onChange={e => setBaseGeneral(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-base-ahorro">Base liquidable del ahorro (€)</LabelConAyuda>
              <Input id="m100-base-ahorro" type="number" min="0" step="0.01" placeholder="0" value={baseAhorro} onChange={e => setBaseAhorro(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-red-trabajo">Reducción rendimientos del trabajo (art. 20 LIRPF) (€)</LabelConAyuda>
              <Input id="m100-red-trabajo" type="number" min="0" step="0.01" placeholder="0" value={reduccionTrabajo} onChange={e => setReduccionTrabajo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-red-ahorro">Reducción del ahorro (€)</LabelConAyuda>
              <Input id="m100-red-ahorro" type="number" min="0" step="0.01" placeholder="0" value={reduccionAhorro} onChange={e => setReduccionAhorro(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Deducciones y pagos</p>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-minimo">Mínimo personal y familiar (€)</LabelConAyuda>
              <Input id="m100-minimo" type="number" min="0" step="0.01" placeholder="5550" value={minimoPersonal} onChange={e => setMinimoPersonal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-deducciones">Deducciones autonómicas (€)</LabelConAyuda>
              <Input id="m100-deducciones" type="number" min="0" step="0.01" placeholder="0" value={deduccionesAutonomicas} onChange={e => setDeduccionesAutonomicas(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-pagos" ayuda={GUIA_MODELO_100.pagosACuenta}>Pagos fraccionados año (€)</LabelConAyuda>
              <Input id="m100-pagos" type="number" min="0" step="0.01" placeholder="0" value={pagosFraccionados} onChange={e => setPagosFraccionados(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-retenciones">Retenciones soportadas (€)</LabelConAyuda>
              <Input id="m100-retenciones" type="number" min="0" step="0.01" placeholder="0" value={retenciones} onChange={e => setRetenciones(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m100-dividendos">Dividendos suj. a retención (para DA 61ª) (€)</LabelConAyuda>
              <Input id="m100-dividendos" type="number" min="0" step="0.01" placeholder="0" value={dividendosIRPF} onChange={e => setDividendosIRPF(e.target.value)} />
            </div>
          </div>
        </div>

        {hasData && (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Base general tras reducción</dt>
              <dd className="text-lg font-semibold">{eur(resultado.baseImponibleGeneral)}</dd>
            </div>
            {resultado.baseImponibleAhorro > 0 && (
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Base ahorro</dt>
                <dd className="text-lg font-semibold">{eur(resultado.baseImponibleAhorro)}</dd>
              </div>
            )}
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Cuota íntegra general</dt>
              <dd className="text-lg font-semibold">{eur(resultado.cuotaIntegra)}</dd>
            </div>
            {resultado.cuotaAhorro > 0 && (
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota ahorro</dt>
                <dd className="text-lg font-semibold">{eur(resultado.cuotaAhorro)}</dd>
              </div>
            )}
            {resultado.deducciones > 0 && (
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Deducciones (DA 61ª + autonómicas)</dt>
                <dd className="text-lg font-semibold text-green-600">{eur(resultado.deducciones)}</dd>
              </div>
            )}
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <dt className="text-xs text-muted-foreground">Cuota líquida anual</dt>
              <dd className="text-lg font-bold text-primary">{eur(resultado.cuotaLiquida)}</dd>
            </div>
            <div className={`rounded-lg border p-3 ${resultado.aDevolver > 0 ? 'border-green-500/50 bg-green-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
              <dt className="text-xs text-muted-foreground">
                {resultado.aDevolver > 0 ? 'Devolución estimada' : 'A ingresar'}
              </dt>
              <dd className={`text-lg font-bold ${resultado.aDevolver > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {resultado.aDevolver > 0 ? (
                  <span className="flex items-center gap-1"><TrendingDown className="h-4 w-4" aria-hidden="true" />{eur(resultado.aDevolver)}</span>
                ) : (
                  <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" aria-hidden="true" />{eur(resultado.aPagar)}</span>
                )}
              </dd>
            </div>
          </dl>
        )}

        {!hasData && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Introduce tus rentas para calcular el resultado de la declaración.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Cálculo con la escala estatal y la autonómica de tu comunidad de la BD (si no hay datos, escala estatal de referencia de 2026). No incluye deducciones autonómicas
          pagos complementarios ni ganancias patrimoniales. Consulta la declaración oficial.
        </p>
      </CardContent>
    </Card>
    </div>
  )
}
