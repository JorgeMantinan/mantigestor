'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { calcularModelo143, CUANTIAS_143, type Concepto143 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_143 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

export function CalculadoraModelo143() {
  const [concepto, setConcepto] = useState<Concepto143>('familiaNumerosaGeneral')
  const [modo, setModo] = useState<'individual' | 'colectiva'>('individual')
  const [meses, setMeses] = useState(12)

  const resultado = useMemo(() => calcularModelo143({ concepto, modo, meses }), [concepto, modo, meses])

  return (
    <div id="pdf-modelo-143" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-143" filename="modelo-143" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 143 — Abono anticipado (familia numerosa / discapacidad)</CardTitle>
              <CardDescription>
                Solicitud del abono anticipado de la deducción por familia numerosa, por ascendiente con dos
                hijos o por personas con discapacidad a cargo (art. 81.bis LIRPF): 100 €/mes (200 €/mes en
                familia numerosa especial).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m143-concepto" ayuda={GUIA_MODELO_143.concepto}>
                Concepto
              </LabelConAyuda>
              <select
                id="m143-concepto"
                className={selectCls}
                value={concepto}
                onChange={e => setConcepto(e.target.value as Concepto143)}
              >
                {(Object.keys(CUANTIAS_143) as Concepto143[]).map(c => (
                  <option key={c} value={c}>
                    {CUANTIAS_143[c].etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m143-modo" ayuda={GUIA_MODELO_143.modo}>
                Modalidad
              </LabelConAyuda>
              <select
                id="m143-modo"
                className={selectCls}
                value={modo}
                onChange={e => setModo(e.target.value as 'individual' | 'colectiva')}
              >
                <option value="individual">Individual (lo abona el pagador)</option>
                <option value="colectiva">Colectiva (lo ingresa la AEAT)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="m143-meses">
                Meses de abono en el año
              </label>
              <select
                id="m143-meses"
                className={selectCls}
                value={meses}
                onChange={e => setMeses(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Abono mensual</dt>
              <dd className="text-lg font-semibold">{formatoEuros(resultado.mensualCents / 100)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Cuantía anual</dt>
              <dd className="text-lg font-semibold">{formatoEuros(resultado.anualCents / 100)}</dd>
            </div>
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <dt className="text-xs text-muted-foreground">Abono estimado ({resultado.meses} meses)</dt>
              <dd className="text-2xl font-bold text-primary">{formatoEuros(resultado.abonoEstimadoCents / 100)}</dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            {resultado.modo === 'individual'
              ? 'Modalidad individual: el importe se abona con la nómina o el pago de la pensión del pagador indicado en la solicitud.'
              : 'Modalidad colectiva: la AEAT ingresa el abono directamente (transferencia bancaria), compatible con los pagos del pagador.'}{' '}
            Los distintos derechos son acumulables (p. ej. familia numerosa + discapacidad a cargo).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
