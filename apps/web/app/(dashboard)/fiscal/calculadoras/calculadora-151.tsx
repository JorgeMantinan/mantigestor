'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plane, FileWarning } from 'lucide-react'
import {
  calcularModelo151,
  LIMITE_TIPO_REDUCIDO_BECKHAM_CENTS,
  TIPO_GENERAL_BECKHAM,
  TIPO_EXCESO_BECKHAM,
} from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_151 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

interface Props {
  taxYear?: number
}

export function CalculadoraModelo151({ taxYear }: Props) {
  const [rendimientos, setRendimientos] = useState('')
  const [pagos, setPagos] = useState('')

  const resultado = useMemo(
    () =>
      calcularModelo151({
        rendimientosBaseGeneralCents: Math.round((parseFloat(rendimientos) || 0) * 100),
        pagosACuentaCents: Math.round((parseFloat(pagos) || 0) * 100),
      }),
    [rendimientos, pagos]
  )

  const hasData = parseFloat(rendimientos) > 0

  return (
    <div id="pdf-modelo-151" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-151" filename="modelo-151" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>
                Modelo 151 — Régimen especial de trabajadores desplazados (Ley Beckham)
                {taxYear ? ` ${taxYear}` : ''}
              </CardTitle>
              <CardDescription>
                Declaración del IRPF de los contribuyentes acogidos al régimen del art. 93 LIRPF («Ley
                Beckham»): tipo fijo del 24 % sobre los rendimientos de fuente española hasta 600.000 € y del
                47 % sobre el exceso, sin mínimos ni deducciones del régimen general.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m151-rendimientos" ayuda={GUIA_MODELO_151.rendimientos}>
                Rendimientos de trabajo, profesionales y alquileres (€)
              </LabelConAyuda>
              <Input
                id="m151-rendimientos"
                type="number"
                min="0"
                step="0.01"
                placeholder="85000.00"
                value={rendimientos}
                onChange={e => setRendimientos(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Solo rentas de fuente española sometidas a este régimen (máx. 6 años desde el desplazamiento).
              </p>
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m151-pagos" ayuda={GUIA_MODELO_151.pagosACuenta}>
                Retenciones y pagos a cuenta (€)
              </LabelConAyuda>
              <Input
                id="m151-pagos"
                type="number"
                min="0"
                step="0.01"
                placeholder="20400.00"
                value={pagos}
                onChange={e => setPagos(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Retención del pagador (24 %) y pagos fraccionados ya ingresados.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p>Hasta {formatoEuros(LIMITE_TIPO_REDUCIDO_BECKHAM_CENTS / 100)}</p>
              <p className="text-lg font-semibold text-foreground">{TIPO_GENERAL_BECKHAM} %</p>
            </div>
            <div className="rounded-lg border p-3">
              <p>Exceso (mismo pagador)</p>
              <p className="text-lg font-semibold text-foreground">{TIPO_EXCESO_BECKHAM} %</p>
            </div>
            <div className="rounded-lg border p-3">
              <p>Plazo</p>
              <p className="text-sm font-medium text-foreground">Igual que el modelo 100</p>
            </div>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Base al 24 %</dt>
                <dd className="text-sm font-semibold">{formatoEuros(resultado.baseHastaLimiteCents / 100)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Base al 47 %</dt>
                <dd className="text-sm font-semibold">{formatoEuros(resultado.baseExcesoCents / 100)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota íntegra</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.cuotaIntegraCents / 100)}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">
                  {resultado.resultadoCents >= 0 ? 'A ingresar' : 'A devolver'}
                </dt>
                <dd className="text-2xl font-bold text-primary">{formatoEuros(Math.abs(resultado.resultadoCents) / 100)}</dd>
              </div>
            </dl>
          )}

          {hasData && resultado.baseExcesoCents > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700">
              <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Parte de los rendimientos supera 600.000 € y tributa al 47 % (mismo pagador).
            </p>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Introduce los rendimientos de fuente española percibidos bajo el régimen del art. 93 LIRPF.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
