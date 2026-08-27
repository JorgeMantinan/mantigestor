'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, BadgeCheck, FileWarning } from 'lucide-react'
import { calcularModelo104, type Categoria104 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_104 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

export function CalculadoraModelo104() {
  const [categoria, setCategoria] = useState<Categoria104>('general')
  const [hijos, setHijos] = useState('2')
  const [retenciones, setRetenciones] = useState('')
  const [rendimientos, setRendimientos] = useState('')

  const resultado = useMemo(
    () =>
      calcularModelo104({
        categoria,
        numHijos: parseInt(hijos, 10) || 0,
        retencionesAnuales: parseFloat(retenciones) || 0,
        rendimientosBrutos: rendimientos.trim() ? parseFloat(rendimientos) || 0 : undefined,
      }),
    [categoria, hijos, retenciones, rendimientos]
  )

  const hasData = parseFloat(retenciones) > 0

  return (
    <div id="pdf-modelo-104" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-104" filename="modelo-104" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 104 — Devolución acelerada (familias numerosas)</CardTitle>
              <CardDescription>
                Solicitud para cobrar por anticipado, mes a mes, la devolución de IRPF por familia numerosa
                o personas con discapacidad a cargo, sin esperar a la declaración anual.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m104-cat" ayuda={GUIA_MODELO_104.categoria}>Situación familiar</LabelConAyuda>
              <select
                id="m104-cat"
                className={selectCls}
                value={categoria}
                onChange={e => setCategoria(e.target.value as Categoria104)}
              >
                <option value="general">Familia numerosa general</option>
                <option value="especial">Familia numerosa especial</option>
                <option value="discapacidad">Persona con discapacidad a cargo</option>
              </select>
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m104-hijos" ayuda={GUIA_MODELO_104.numHijos}>Nº de hijos / personas a cargo</LabelConAyuda>
              <Input id="m104-hijos" type="number" min="1" step="1" placeholder="2" value={hijos} onChange={e => setHijos(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m104-ret" ayuda={GUIA_MODELO_104.retencionesAnuales}>Retenciones IRPF del año (€)</LabelConAyuda>
              <Input id="m104-ret" type="number" min="0" step="0.01" placeholder="6000" value={retenciones} onChange={e => setRetenciones(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m104-rend" ayuda={GUIA_MODELO_104.rendimientosBrutos}>Rendimientos brutos del trabajo (€)</LabelConAyuda>
              <Input id="m104-rend" type="number" min="0" step="0.01" placeholder="24000" value={rendimientos} onChange={e => setRendimientos(e.target.value)} />
            </div>
          </div>

          {hasData && (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Mínimo por situación (base)</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.minimoBase)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Retenciones del año</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.retencionesAnuales)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Devolución estimada anual</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.devolucionEstimada)}</dd>
                </div>
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <dt className="text-xs text-muted-foreground">Importe mensual solicitable</dt>
                  <dd className="text-2xl font-bold flex items-center gap-1 text-primary">
                    <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                    {formatoEuros(resultado.mensualSolicitable)}
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
              Introduce las retenciones de IRPF del año para estimar el anticipo mensual que puedes solicitar.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            El modelo 104 se presenta una vez al año y la AEAT abona el importe mensualmente. El límite mensual
            está condicionado a la devolución resultante; esta calculadora es orientativa. La solicitud la presenta
            el titular del trabajo con las retenciones.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
