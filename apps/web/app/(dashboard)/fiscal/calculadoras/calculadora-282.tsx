'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Palmtree, Plus, Trash2, FileWarning } from 'lucide-react'
import { calcularModelo282, type Ayuda282 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

interface FilaUI {
  id: string
  organismo: string
  concepto: string
  ejercicio: string
  importe: string
}

function filaVacia(anyo: number): FilaUI {
  return { id: crypto.randomUUID(), organismo: '', concepto: '', ejercicio: String(anyo), importe: '' }
}

interface Props {
  taxYear?: number
}

export function CalculadoraModelo282({ taxYear }: Props) {
  const anyo = taxYear ?? new Date().getFullYear()
  const [filas, setFilas] = useState<FilaUI[]>([filaVacia(anyo)])

  const resultado = useMemo(() => {
    const ayudas: Ayuda282[] = filas
      .filter(f => parseFloat(f.importe) > 0)
      .map(f => ({
        organismo: f.organismo.trim(),
        concepto: f.concepto.trim() || 'Ayuda REF / de Estado',
        ejercicio: parseInt(f.ejercicio, 10) || anyo,
        importeCents: Math.round((parseFloat(f.importe) || 0) * 100),
      }))
    return calcularModelo282({ ayudas })
  }, [filas, anyo])

  const update = (id: string, patch: Partial<FilaUI>) =>
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const hasData = filas.some(f => parseFloat(f.importe) > 0)

  return (
    <div id="pdf-modelo-282" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-282" filename="modelo-282" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 282 — Ayudas REF Canarias y ayudas de Estado</CardTitle>
              <CardDescription>
                Declaración informativa anual de las ayudas recibidas en el marco del Régimen Económico y
                Fiscal de Canarias y otras ayudas de Estado derivadas del Derecho de la UE (Orden HAP/296/2016).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span>
              <strong>Plazo:</strong> el de la autoliquidación del IRPF, IS o IRNR del año anterior.
            </span>
          </div>

          <div className="space-y-3">
            <div className="hidden grid-cols-[2fr_2fr_1fr_1fr_2rem] gap-3 px-1 text-xs text-muted-foreground sm:grid">
              <span>Organismo concedente</span>
              <span>Concepto de la ayuda</span>
              <span>Ejercicio</span>
              <span>Importe (€)</span>
              <span />
            </div>
            {filas.map(f => (
              <div
                key={f.id}
                className="grid grid-cols-[1fr] gap-3 sm:grid-cols-[2fr_2fr_1fr_1fr_2rem] sm:items-center"
              >
                <Input
                  placeholder="Gobierno de Canarias"
                  value={f.organismo}
                  onChange={e => update(f.id, { organismo: e.target.value })}
                  aria-label="Organismo concedente"
                />
                <Input
                  placeholder="Ayuda REF — inversión"
                  value={f.concepto}
                  onChange={e => update(f.id, { concepto: e.target.value })}
                  aria-label="Concepto"
                />
                <Input
                  type="number"
                  min="2000"
                  max="2100"
                  value={f.ejercicio}
                  onChange={e => update(f.id, { ejercicio: e.target.value })}
                  aria-label="Ejercicio"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="5000.00"
                  value={f.importe}
                  onChange={e => update(f.id, { importe: e.target.value })}
                  aria-label="Importe"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Eliminar ayuda"
                  disabled={filas.length === 1}
                  onClick={() => setFilas(prev => prev.filter(x => x.id !== f.id))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setFilas(prev => [...prev, filaVacia(anyo)])}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Añadir ayuda
            </Button>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Ayudas declaradas</dt>
                <dd className="text-lg font-semibold">{resultado.numAyudas}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Total ayudas recibidas</dt>
                <dd className="text-2xl font-bold text-primary">{formatoEuros(resultado.totalCents / 100)}</dd>
              </div>
            </dl>
          )}

          {hasData && resultado.porEjercicio.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Desglose por ejercicio</p>
              <div className="flex flex-wrap gap-2">
                {resultado.porEjercicio.map(e => (
                  <span key={e.ejercicio} className="rounded-lg border px-3 py-1.5 text-sm">
                    {e.ejercicio}: <strong>{formatoEuros(e.totalCents / 100)}</strong>
                  </span>
                ))}
              </div>
            </div>
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
              Añade las ayudas del REF de Canarias o de Estado recibidas en el año.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
