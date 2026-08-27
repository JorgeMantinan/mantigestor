'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Receipt, Plus, Trash2, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calcularModelo110, type TipoRetencion110 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_110 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

const ETIQUETA_TIPO: Record<TipoRetencion110, string> = {
  capitalInmobiliario: 'Capital inmobiliario (no arrendamiento)',
  premios: 'Premios',
  gananciaPatrimonial: 'Ganancia patrimonial (no inmuebles)',
  especie: 'Retribución en especie',
  otros: 'Otros',
}

interface FilaUI {
  id: string
  tipo: TipoRetencion110
  importe: string
  tipoRetencion: string
}

export function CalculadoraModelo110() {
  const [periodo, setPeriodo] = useState<string>('3')
  const [filas, setFilas] = useState<FilaUI[]>([
    { id: crypto.randomUUID(), tipo: 'premios', importe: '', tipoRetencion: '19' },
  ])

  const resultado = useMemo(
    () =>
      calcularModelo110({
        periodo: periodo === 'anual' ? 'anual' : parseInt(periodo, 10) || 1,
        filas: filas.map(f => ({
          tipo: f.tipo,
          importe: parseFloat(f.importe) || 0,
          tipoRetencion: parseFloat(f.tipoRetencion) || 0,
        })),
      }),
    [periodo, filas]
  )

  const update = (id: string, patch: Partial<FilaUI>) =>
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const hasData = filas.some(f => parseFloat(f.importe) > 0)

  return (
    <div id="pdf-modelo-110" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-110" filename="modelo-110" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 110 — Otras retenciones e ingresos a cuenta del IRPF</CardTitle>
              <CardDescription>
                Declaración de las retenciones que no tienen modelo propio (111, 115, 123...): capital
                inmobiliario distinto del arrendamiento, premios, ganancias patrimoniales no derivadas de
                inmuebles, retribuciones en especie, etc.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m110-periodo" ayuda={GUIA_MODELO_110.periodo}>Periodo</LabelConAyuda>
              <select id="m110-periodo" className={selectCls} value={periodo} onChange={e => setPeriodo(e.target.value)}>
                <option value="1">Trimestre 1</option>
                <option value="2">Trimestre 2</option>
                <option value="3">Trimestre 3</option>
                <option value="4">Trimestre 4</option>
                <option value="anual">Resumen anual</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="hidden grid-cols-[1fr_1fr_1fr_2rem] gap-3 px-1 text-xs text-muted-foreground sm:grid">
              <span>Tipo de retención</span>
              <span>Importe bruto (€)</span>
              <span>Retención (%)</span>
              <span />
            </div>
            {filas.map((f) => (
              <div key={f.id} className="grid grid-cols-[1fr] gap-3 sm:grid-cols-[1fr_1fr_1fr_2rem] sm:items-center">
                <select
                  className={selectCls}
                  value={f.tipo}
                  onChange={e => update(f.id, { tipo: e.target.value as TipoRetencion110 })}
                >
                  {(Object.keys(ETIQUETA_TIPO) as TipoRetencion110[]).map(t => (
                    <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>
                  ))}
                </select>
                <Input type="number" min="0" step="0.01" placeholder="1000" value={f.importe} onChange={e => update(f.id, { importe: e.target.value })} />
                <Input type="number" min="0" step="0.01" placeholder="19" value={f.tipoRetencion} onChange={e => update(f.id, { tipoRetencion: e.target.value })} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Eliminar fila"
                  disabled={filas.length === 1}
                  onClick={() => setFilas(prev => prev.filter(x => x.id !== f.id))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setFilas(prev => [...prev, { id: crypto.randomUUID(), tipo: 'otros', importe: '', tipoRetencion: '19' }])}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Añadir retención
            </Button>
          </div>

          {hasData && (
            <div className="space-y-3">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Base total</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.baseTotal)}</dd>
                </div>
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <dt className="text-xs text-muted-foreground">Retención a ingresar</dt>
                  <dd className="text-2xl font-bold text-primary">{formatoEuros(resultado.retencionTotal)}</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Nº de retenciones</dt>
                  <dd className="text-lg font-semibold">{resultado.nFilas}</dd>
                </div>
              </dl>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-right">Base</th>
                      <th className="px-3 py-2 text-right">Retención</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.detalle.map((d, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{ETIQUETA_TIPO[d.tipo]}</td>
                        <td className="px-3 py-2 text-right">{formatoEuros(d.base)}</td>
                        <td className="px-3 py-2 text-right">{formatoEuros(d.retencion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Añade las retenciones practicadas para estimar el ingreso del trimestre o del resumen anual.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
