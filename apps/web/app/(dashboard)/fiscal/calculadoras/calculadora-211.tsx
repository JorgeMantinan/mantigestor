'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Home, PiggyBank, FileWarning } from 'lucide-react'
import { calcularModelo211, TIPO_RETENCION_IRNR_INMUEBLES } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_211 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

export function CalculadoraModelo211() {
  const [precio, setPrecio] = useState('')
  const [tipo, setTipo] = useState(String(TIPO_RETENCION_IRNR_INMUEBLES))
  const [esperaCauta, setEsperaCauta] = useState(false)

  const resultado = useMemo(
    () =>
      calcularModelo211({
        precioVenta: parseFloat(precio) || 0,
        tipoRetencionPct: tipo.trim() ? parseFloat(tipo) || 0 : undefined,
        conEsperaCauta: esperaCauta,
      }),
    [precio, tipo, esperaCauta]
  )

  const hasData = parseFloat(precio) > 0

  return (
    <div id="pdf-modelo-211" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-211" filename="modelo-211" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 211 — Retención IRNR por compra a no residentes</CardTitle>
              <CardDescription>
                Cuando adquieres un inmueble a un vendedor no residente (sin establecimiento permanentente en
                España), debes retener el 3% e ingresarlo mediante el modelo 211.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m211-precio" ayuda={GUIA_MODELO_211.precioVenta}>Precio de la transmisión (€)</LabelConAyuda>
              <Input id="m211-precio" type="number" min="0" step="0.01" placeholder="200000" value={precio} onChange={e => setPrecio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m211-tipo" ayuda={GUIA_MODELO_211.tipoRetencion}>Tipo de retención (%)</LabelConAyuda>
              <Input id="m211-tipo" type="number" min="0" step="0.1" placeholder="3" value={tipo} onChange={e => setTipo(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={esperaCauta}
              onChange={e => setEsperaCauta(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span>Se ha asegurado el pago a Hacienda (espera cauta, art. 25.2 LIRNR) — exención de retención</span>
          </label>

          {hasData && (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Precio de transmisión</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.precioVenta)}</dd>
                </div>
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <dt className="text-xs text-muted-foreground">Retención a ingresar (211)</dt>
                  <dd className="text-lg font-bold text-primary">{formatoEuros(resultado.retencion)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Neto a pagar al vendedor</dt>
                  <dd className="text-lg font-semibold flex items-center gap-1">
                    <PiggyBank className="h-4 w-4" aria-hidden="true" />
                    {formatoEuros(resultado.netoAlVendedor)}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Retención aplicable</dt>
                  <dd className={`text-lg font-bold ${resultado.retencionAplicable ? 'text-amber-600' : 'text-green-600'}`}>
                    {resultado.retencionAplicable ? 'Sí' : 'No'}
                  </dd>
                </div>
              </dl>

              {resultado.avisos.length > 0 && (
                <div className="space-y-1">
                  {resultado.avisos.map((a) => (
                    <p key={a} className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700">
                      <FileWarning className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                      {a}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Introduce el precio de compra para calcular la retención del 3% que debes ingresar con el modelo 211.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            El modelo 211 se presenta en el mes siguiente a la fecha de devengo (normalmente el mes siguiente a la
            compra). El comprador entrega al vendedor el neto y paga el 3% a Hacienda en su nombre. Para la compra de
            vivienda habitual por el propio no residente puede no proceder la retención.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
