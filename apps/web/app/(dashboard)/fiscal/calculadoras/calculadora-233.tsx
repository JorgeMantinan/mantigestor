'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Baby, Plus, Trash2, FileWarning } from 'lucide-react'
import { calcularModelo233, incrementoDeduccionGuarderia, type Menor233 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_233 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

interface FilaUI {
  id: string
  nif: string
  nombre: string
  meses: string
  gastos: string
  subvencion: string
}

function filaVacia(): FilaUI {
  return { id: crypto.randomUUID(), nif: '', nombre: '', meses: '9', gastos: '', subvencion: '' }
}

export function CalculadoraModelo233() {
  const [filas, setFilas] = useState<FilaUI[]>([filaVacia()])

  const resultado = useMemo(() => {
    const menores: Menor233[] = filas
      .filter(f => parseFloat(f.gastos) > 0 || parseFloat(f.subvencion) > 0)
      .map(f => ({
        nif: f.nif.trim() || 'S/N',
        nombre: f.nombre.trim(),
        meses: parseInt(f.meses, 10) || 0,
        gastosPagadosCents: Math.round((parseFloat(f.gastos) || 0) * 100),
        subvencionCents: Math.round((parseFloat(f.subvencion) || 0) * 100),
      }))
    return calcularModelo233({ menores })
  }, [filas])

  const update = (id: string, patch: Partial<FilaUI>) =>
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const hasData = filas.some(f => parseFloat(f.gastos) > 0 || parseFloat(f.subvencion) > 0)
  const incremento = incrementoDeduccionGuarderia(resultado.gastosNetosCents)

  return (
    <div id="pdf-modelo-233" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-233" filename="modelo-233" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 233 — Gastos en guarderías y centros de educación infantil</CardTitle>
              <CardDescription>
                Declaración informativa que presenta EXCLUSIVAMENTE la guardería o centro autorizado (no los
                progenitores) con los menores, los meses de custodia, los gastos pagados y las subvenciones
                (Orden HAC/1400/2018, modificada por la Orden HAC/682/2025 para ejercicios 2025 y siguientes).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span>
              <strong>Plazo:</strong> del 1 de enero al 2 de febrero (mes de enero) en relación con el año
              inmediato anterior.
            </span>
          </div>

          <div className="space-y-3">
            <div className="hidden grid-cols-[1fr_2fr_1fr_1fr_1fr_2rem] gap-3 px-1 text-xs text-muted-foreground sm:grid">
              <span>NIF del menor</span>
              <span>Apellidos y nombre</span>
              <span>Meses completos</span>
              <span>Gastos pagados (€)</span>
              <span>Subvención (€)</span>
              <span />
            </div>
            {filas.map(f => (
              <div
                key={f.id}
                className="grid grid-cols-[1fr] gap-3 sm:grid-cols-[1fr_2fr_1fr_1fr_1fr_2rem] sm:items-center"
              >
                <Input placeholder="12345678A" value={f.nif} onChange={e => update(f.id, { nif: e.target.value })} aria-label="NIF del menor" />
                <Input placeholder="Apellidos y nombre" value={f.nombre} onChange={e => update(f.id, { nombre: e.target.value })} aria-label="Nombre del menor" />
                <select className={selectCls} value={f.meses} onChange={e => update(f.id, { meses: e.target.value })} aria-label="Meses de custodia">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <Input type="number" min="0" step="0.01" placeholder="4800.00" value={f.gastos} onChange={e => update(f.id, { gastos: e.target.value })} aria-label="Gastos pagados" />
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={f.subvencion} onChange={e => update(f.id, { subvencion: e.target.value })} aria-label="Subvención" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Eliminar menor"
                  disabled={filas.length === 1}
                  onClick={() => setFilas(prev => prev.filter(x => x.id !== f.id))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setFilas(prev => [...prev, filaVacia()])}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Añadir menor
            </Button>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Menores</dt>
                <dd className="text-lg font-semibold">{resultado.numMenores}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Gastos pagados</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.gastosTotalesCents / 100)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Gastos no subvencionados</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.gastosNetosCents / 100)}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Incremento máx. deducción maternidad</dt>
                <dd className="text-2xl font-bold text-primary">{formatoEuros(incremento / 100)}</dd>
              </div>
            </dl>
          )}

          <div className="space-y-2">
            <LabelConAyuda htmlFor="m233-deduccion" ayuda={GUIA_MODELO_233.deduccion}>
              <span className="text-xs text-muted-foreground">
                Los gastos informados respaldan el incremento de la deducción por maternidad por custodia de
                menores de 3 años (art. 81.2 LIRPF): 25 % de los primeros 4.000 €, máx. 1.000 €.
              </span>
            </LabelConAyuda>
          </div>

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
              Añade los menores custodiados en el centro con sus gastos y subvenciones del ejercicio.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
