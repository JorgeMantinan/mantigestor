'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Building2, FileWarning, Sparkles } from 'lucide-react'
import { calcularPlusvaliaMunicipal, type MetodoPlusvalia } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_PLUSVALIA } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

export function CalculadoraPlusvalia() {
  const [metodo, setMetodo] = useState<MetodoPlusvalia>('objetivo')
  const [vct, setVct] = useState('100000')
  const [anyos, setAnyos] = useState('10')
  const [tipo, setTipo] = useState('30')
  const [adquisicion, setAdquisicion] = useState('')
  const [transmision, setTransmision] = useState('')

  const resultado = useMemo(
    () =>
      calcularPlusvaliaMunicipal({
        metodo,
        valorCatastralTerreno: parseFloat(vct) || 0,
        anyosTenencia: parseInt(anyos, 10) || 0,
        tipoMunicipal: parseFloat(tipo) || 0,
        valorAdquisicion: metodo === 'real' && adquisicion.trim() ? parseFloat(adquisicion) || 0 : undefined,
        valorTransmision: metodo === 'real' && transmision.trim() ? parseFloat(transmision) || 0 : undefined,
      }),
    [metodo, vct, anyos, tipo, adquisicion, transmision]
  )

  return (
    <div id="pdf-plusvalia" className="space-y-3">
      <BotonPDF elementId="pdf-plusvalia" filename="plusvalia-municipal" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Plusvalía municipal (IIVTNU)</CardTitle>
              <CardDescription>
                Impuesto sobre el Incremento de Valor de los Terrenos de Naturaleza Urbana, que se paga al
                ayuntamiento al vender un terreno. Cada municipio fija su tipo y gestión (no hay un nº de
                modelo único). Calcula la cuota por el método objetivo o el real.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="pv-metodo" ayuda={GUIA_PLUSVALIA.metodo}>Método de cálculo</LabelConAyuda>
              <select
                id="pv-metodo"
                className={selectCls}
                value={metodo}
                onChange={e => setMetodo(e.target.value as MetodoPlusvalia)}
              >
                <option value="objetivo">Objetivo (valor catastral × coeficiente)</option>
                <option value="real">Real (plusvalía efectiva)</option>
              </select>
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="pv-vct" ayuda={GUIA_PLUSVALIA.valorCatastralTerreno}>Valor catastral del terreno (€)</LabelConAyuda>
              <Input id="pv-vct" type="number" min="0" step="0.01" value={vct} onChange={e => setVct(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="pv-anyos" ayuda={GUIA_PLUSVALIA.anyosTenencia}>Años de tenencia</LabelConAyuda>
              <Input id="pv-anyos" type="number" min="0" step="1" value={anyos} onChange={e => setAnyos(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelConAyuda htmlFor="pv-tipo" ayuda={GUIA_PLUSVALIA.tipoMunicipal}>Tipo municipal (%)</LabelConAyuda>
              <Input id="pv-tipo" type="number" min="0" step="0.01" value={tipo} onChange={e => setTipo(e.target.value)} />
            </div>
          </div>

          {metodo === 'real' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <LabelConAyuda htmlFor="pv-adq" ayuda={GUIA_PLUSVALIA.metodo}>Valor de adquisición (€)</LabelConAyuda>
                <Input id="pv-adq" type="number" min="0" step="0.01" placeholder="120000" value={adquisicion} onChange={e => setAdquisicion(e.target.value)} />
              </div>
              <div className="space-y-2">
                <LabelConAyuda htmlFor="pv-trans" ayuda={GUIA_PLUSVALIA.metodo}>Valor de transmisión (€)</LabelConAyuda>
                <Input id="pv-trans" type="number" min="0" step="0.01" placeholder="180000" value={transmision} onChange={e => setTransmision(e.target.value)} />
              </div>
            </div>
          )}

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Base imponible</dt>
              <dd className="text-lg font-semibold">{formatoEuros(resultado.baseImponible)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Tipo efectivo</dt>
              <dd className="text-lg font-semibold">{resultado.tipoEfectivo.toFixed(2)}%</dd>
            </div>
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <dt className="text-xs text-muted-foreground">Cuota a pagar</dt>
              <dd className="text-2xl font-bold text-primary">{formatoEuros(resultado.cuota)}</dd>
            </div>
          </dl>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Método</th>
                  <th className="px-3 py-2 text-right">Base imponible</th>
                  <th className="px-3 py-2 text-right">Cuota</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className={`px-3 py-2 ${resultado.metodoFavorable === 'objetivo' ? 'font-semibold' : ''}`}>
                    Objetivo (catastral × coeficiente){resultado.metodoFavorable === 'objetivo' ? ' · más favorable' : ''}
                  </td>
                  <td className="px-3 py-2 text-right">{formatoEuros(resultado.baseObjetiva)}</td>
                  <td className="px-3 py-2 text-right">{formatoEuros(resultado.baseObjetiva * (resultado.tipoEfectivo / 100))}</td>
                </tr>
                <tr className="border-t">
                  <td className={`px-3 py-2 ${resultado.metodoFavorable === 'real' ? 'font-semibold' : ''}`}>
                    Real (plusvalía){resultado.metodoFavorable === 'real' ? ' · más favorable' : ''}
                  </td>
                  <td className="px-3 py-2 text-right">{formatoEuros(resultado.baseReal)}</td>
                  <td className="px-3 py-2 text-right">{formatoEuros(resultado.baseReal * (resultado.tipoEfectivo / 100))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {resultado.metodo === 'objetivo' && resultado.baseReal > 0 && resultado.baseReal < resultado.baseObjetiva && (
            <p className="flex items-start gap-1.5 rounded-lg border border-primary/50 bg-primary/5 p-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              El método <strong>real</strong> resulta más favorable: cuota {formatoEuros(resultado.cuotaMinima)} en vez de {formatoEuros(resultado.cuota)}. Confirma con tu ayuntamiento si admite alegación.
            </p>
          )}

          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{resultado.detalle}</p>

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

          <p className="text-xs text-muted-foreground">
            La plusvalía se paga al ayuntamiento donde está el terreno, normalmente dentro de los 30 días
            hábiles siguientes a la transmisión. Esta calculadora es orientativa: cada municipio puede aplicar
            coeficientes o tipos distintos a los máximos legales aquí usados.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
