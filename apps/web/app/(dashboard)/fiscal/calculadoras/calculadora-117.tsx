'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TrendingUp, Plus, Trash2, FileWarning } from 'lucide-react'
import { calcularModelo117, TIPO_RETENCION_IIC, type Concepto117, type Fila117 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_117 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

const ETIQUETA_CONCEPTO: Record<Concepto117, string> = {
  reembolso: 'Reembolso de participaciones (fondo)',
  transmision: 'Transmisión de acciones/participaciones de IIC',
  derechosSuscripcion: 'Transmisión de derechos de suscripción',
}

interface FilaUI {
  id: string
  concepto: Concepto117
  nif: string
  descripcion: string
  contraprestacion: string
  adquisicion: string
}

function filaVacia(): FilaUI {
  return {
    id: crypto.randomUUID(),
    concepto: 'reembolso',
    nif: '',
    descripcion: '',
    contraprestacion: '',
    adquisicion: '',
  }
}

export function CalculadoraModelo117() {
  const [periodo, setPeriodo] = useState<string>('1')
  const [filas, setFilas] = useState<FilaUI[]>([filaVacia()])

  const resultado = useMemo(() => {
    const entradas: Fila117[] = filas
      .filter(f => parseFloat(f.contraprestacion) > 0)
      .map(f => ({
        concepto: f.concepto,
        nif: f.nif.trim() || 'S/N',
        descripcion: f.descripcion.trim() || undefined,
        contraprestacionCents: Math.round((parseFloat(f.contraprestacion) || 0) * 100),
        adquisicionCents: Math.round((parseFloat(f.adquisicion) || 0) * 100),
      }))
    return calcularModelo117({
      periodo: periodo === 'anual' ? 'anual' : parseInt(periodo, 10) || 1,
      filas: entradas,
    })
  }, [filas, periodo])

  const update = (id: string, patch: Partial<FilaUI>) =>
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const hasData = filas.some(f => parseFloat(f.contraprestacion) > 0)

  return (
    <div id="pdf-modelo-117" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-117" filename="modelo-117" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 117 — Retenciones sobre IIC (fondos de inversión)</CardTitle>
              <CardDescription>
                Autoliquidación trimestral de las retenciones del 19 % sobre las ganancias de la transmisión o
                reembolso de acciones o participaciones en Instituciones de Inversión Colectiva y sobre la
                transmisión de derechos de suscripción (art. 101.6 LIRPF).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="flex items-end">
              <div className="w-full rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                Tipo aplicable: <strong>{TIPO_RETENCION_IIC} %</strong> sobre la ganancia (cuadro AEAT de tipos de
                retención).
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="hidden grid-cols-[1fr_2fr_1fr_1fr_2rem] gap-3 px-1 text-xs text-muted-foreground sm:grid">
              <span>Concepto</span>
              <span>Fondo / entidad (NIF y nombre)</span>
              <span>Contraprestación (€)</span>
              <span>Coste de adquisición (€)</span>
              <span />
            </div>
            {filas.map(f => (
              <div
                key={f.id}
                className="grid grid-cols-[1fr] gap-3 sm:grid-cols-[1fr_2fr_1fr_1fr_2rem] sm:items-center"
              >
                <select
                  className={selectCls}
                  value={f.concepto}
                  onChange={e => update(f.id, { concepto: e.target.value as Concepto117 })}
                >
                  {(Object.keys(ETIQUETA_CONCEPTO) as Concepto117[]).map(c => (
                    <option key={c} value={c}>
                      {ETIQUETA_CONCEPTO[c]}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-[9rem_1fr] gap-2">
                  <Input
                    placeholder="NIF"
                    value={f.nif}
                    onChange={e => update(f.id, { nif: e.target.value })}
                    aria-label="NIF de la entidad"
                  />
                  <Input
                    placeholder="Nombre del fondo o valor"
                    value={f.descripcion}
                    onChange={e => update(f.id, { descripcion: e.target.value })}
                    aria-label="Descripción"
                  />
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2500.00"
                  value={f.contraprestacion}
                  onChange={e => update(f.id, { contraprestacion: e.target.value })}
                  aria-label="Contraprestación"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2000.00"
                  value={f.adquisicion}
                  onChange={e => update(f.id, { adquisicion: e.target.value })}
                  aria-label="Coste de adquisición"
                  disabled={f.concepto === 'derechosSuscripcion'}
                />
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
            <Button variant="outline" size="sm" onClick={() => setFilas(prev => [...prev, filaVacia()])}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Añadir operación
            </Button>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Base (ganancias sometidas a retención)</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.baseTotal / 100)}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Retención a ingresar</dt>
                <dd className="text-2xl font-bold text-primary">{formatoEuros(resultado.retencionTotal / 100)}</dd>
              </div>
            </dl>
          )}

          {resultado.avisos.length > 0 && (
            <div className="space-y-1">
              {resultado.avisos.map(a => (
                <p
                  key={a}
                  className="flex items-start gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700"
                >
                  <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {a}
                </p>
              ))}
            </div>
          )}

          {!hasData && (
            <p className="text-sm text-muted-foreground">
              Añade los reembolsos o transmisiones de IIC del trimestre para calcular la retención del 19 %.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
