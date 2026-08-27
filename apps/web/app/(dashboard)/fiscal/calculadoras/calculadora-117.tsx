'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Wheat, Plus, Trash2, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calcularModelo117, type TipoActividad117 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_117 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

const ETIQUETA_TIPO: Record<TipoActividad117, string> = {
  ganadoOtro: 'Ganado (distinto del ibérico originario)',
  ganadoIbericoOriginario: 'Ganado ibérico originario',
  madera: 'Madera',
  productosLacteosOrigen: 'Productos lácteos en origen',
  especie: 'Retribución en especie',
  otras: 'Otras',
}

interface FilaUI {
  id: string
  tipo: TipoActividad117
  importe: string
  tipoRetencion: string
}

export function CalculadoraModelo117() {
  const [periodo, setPeriodo] = useState<string>('3')
  const [filas, setFilas] = useState<FilaUI[]>([
    { id: crypto.randomUUID(), tipo: 'madera', importe: '', tipoRetencion: '1' },
  ])

  const resultado = useMemo(
    () =>
      calcularModelo117({
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
    <div id="pdf-modelo-117" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-117" filename="modelo-117" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 117 — Retenciones de actividades agrícolas y ganaderas</CardTitle>
              <CardDescription>
                Declaración de las retenciones e ingresos a cuenta de rentas derivadas de actividades del
                sector primario (venta de ganado, madera, productos lácteos en origen, etc.).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m117-periodo" ayuda={GUIA_MODELO_117.periodo}>Periodo</LabelConAyuda>
              <select id="m117-periodo" className={selectCls} value={periodo} onChange={e => setPeriodo(e.target.value)}>
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
              <span>Tipo de actividad</span>
              <span>Importe bruto (€)</span>
              <span>Retención (%)</span>
              <span />
            </div>
            {filas.map((f) => (
              <div key={f.id} className="grid grid-cols-[1fr] gap-3 sm:grid-cols-[1fr_1fr_1fr_2rem] sm:items-center">
                <select
                  className={selectCls}
                  value={f.tipo}
                  onChange={e => update(f.id, { tipo: e.target.value as TipoActividad117 })}
                >
                  {(Object.keys(ETIQUETA_TIPO) as TipoActividad117[]).map(t => (
                    <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>
                  ))}
                </select>
                <Input type="number" min="0" step="0.01" placeholder="1000" value={f.importe} onChange={e => update(f.id, { importe: e.target.value })} />
                <Input type="number" min="0" step="0.01" placeholder="1" value={f.tipoRetencion} onChange={e => update(f.id, { tipoRetencion: e.target.value })} />
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
            <Button variant="outline" size="sm" onClick={() => setFilas(prev => [...prev, { id: crypto.randomUUID(), tipo: 'otras', importe: '', tipoRetencion: '1' }])}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Añadir operación
            </Button>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Base total</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.baseTotal)}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Retención a ingresar</dt>
                <dd className="text-2xl font-bold text-primary">{formatoEuros(resultado.retencionTotal)}</dd>
              </div>
            </dl>
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
              Añade las operaciones del sector primario para estimar la retención a ingresar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
