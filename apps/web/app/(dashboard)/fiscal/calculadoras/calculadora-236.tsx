'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Globe2, Plus, Trash2, FileWarning } from 'lucide-react'
import { calcularModelo236, type Mecanismo236 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

interface FilaUI {
  id: string
  descripcion: string
  fechaUtilizacion: string
  estadosAfectados: string
  primeraDeclaracion: boolean
  comercializable: boolean
}

function filaVacia(anyo: number): FilaUI {
  return {
    id: crypto.randomUUID(),
    descripcion: '',
    fechaUtilizacion: `${anyo}-01-15`,
    estadosAfectados: 'España',
    primeraDeclaracion: true,
    comercializable: false,
  }
}

interface Props {
  taxYear?: number
}

export function CalculadoraModelo236({ taxYear }: Props) {
  const anyo = taxYear ?? new Date().getFullYear()
  const [filas, setFilas] = useState<FilaUI[]>([filaVacia(anyo)])

  const resultado = useMemo(() => {
    const mecanismos: Mecanismo236[] = filas
      .filter(f => f.descripcion.trim())
      .map(f => ({
        descripcion: f.descripcion.trim(),
        fechaUtilizacion: f.fechaUtilizacion,
        estadosAfectados: f.estadosAfectados,
        primeraDeclaracion: f.primeraDeclaracion,
        comercializable: f.comercializable,
      }))
    return calcularModelo236({ anyoUtilizacion: anyo, mecanismos })
  }, [filas, anyo])

  const update = (id: string, patch: Partial<FilaUI>) =>
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const hasData = filas.some(f => f.descripcion.trim())

  return (
    <div id="pdf-modelo-236" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-236" filename="modelo-236" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 236 — Uso de mecanismos transfronterizos (DAC6)</CardTitle>
              <CardDescription>
                Declaración informativa de la utilización en España de mecanismos transfronterizos de
                planificación fiscal que hubieron de ser previamente declarados (DA 23.1.c LGT). Lo presentan
                los propios obligados que los utilizan, no los intermediarios (Orden HAC/342/2021).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span>
              <strong>Plazo:</strong> {resultado.plazo} (art. 49.3 RGAT).
            </span>
          </div>

          <div className="space-y-3">
            <div className="hidden grid-cols-[2fr_1fr_1.5fr_1fr_1fr_2rem] gap-3 px-1 text-xs text-muted-foreground sm:grid">
              <span>Descripción del mecanismo</span>
              <span>Fecha de utilización</span>
              <span>Estados miembros afectados</span>
              <span>1ª declaración</span>
              <span>Comercializable</span>
              <span />
            </div>
            {filas.map(f => (
              <div
                key={f.id}
                className="grid grid-cols-[1fr] gap-3 sm:grid-cols-[2fr_1fr_1.5fr_1fr_1fr_2rem] sm:items-center"
              >
                <Input
                  placeholder="Acuerdo, operación o esquema"
                  value={f.descripcion}
                  onChange={e => update(f.id, { descripcion: e.target.value })}
                  aria-label="Descripción del mecanismo"
                />
                <Input
                  type="date"
                  value={f.fechaUtilizacion}
                  onChange={e => update(f.id, { fechaUtilizacion: e.target.value })}
                  aria-label="Fecha de utilización"
                />
                <Input
                  placeholder="España; Francia"
                  value={f.estadosAfectados}
                  onChange={e => update(f.id, { estadosAfectados: e.target.value })}
                  aria-label="Estados miembros afectados"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.primeraDeclaracion}
                    onChange={e => update(f.id, { primeraDeclaracion: e.target.checked })}
                  />
                  Sí
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.comercializable}
                    onChange={e => update(f.id, { comercializable: e.target.checked })}
                  />
                  Sí
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Eliminar mecanismo"
                  disabled={filas.length === 1}
                  onClick={() => setFilas(prev => prev.filter(x => x.id !== f.id))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setFilas(prev => [...prev, filaVacia(anyo)])}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Añadir mecanismo
            </Button>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Mecanismos</dt>
                <dd className="text-lg font-semibold">{resultado.numMecanismos}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Primera declaración</dt>
                <dd className="text-lg font-semibold">{resultado.numPrimeraDeclaracion}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Comercializables</dt>
                <dd className="text-lg font-semibold">{resultado.numComercializables}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Año de presentación</dt>
                <dd className="text-2xl font-bold text-primary">{resultado.anyoPresentacion}</dd>
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
              Registra los mecanismos transfronterizos utilizados en {anyo} que ya hubieron de ser declarados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
