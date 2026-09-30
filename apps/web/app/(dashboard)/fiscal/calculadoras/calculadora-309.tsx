'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Plus, Trash2, FileWarning } from 'lucide-react'
import { calcularModelo309, MOTIVOS_309, type Liquidacion309, type Motivo309 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_309 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

interface FilaUI {
  id: string
  tipo: string
  base: string
}

function filaVacia(tipo = '21', base = ''): FilaUI {
  return { id: crypto.randomUUID(), tipo, base }
}

interface Props {
  taxYear?: number
  datosIniciales?: { base21?: number; base10?: number; base4?: number; deducciones?: number }
}

export function CalculadoraModelo309({ taxYear, datosIniciales }: Props) {
  const [motivo, setMotivo] = useState<Motivo309>('operacionNoPeriodica')
  const [ejercicioOriginal, setEjercicioOriginal] = useState(String(taxYear ?? ''))
  const [periodoOriginal, setPeriodoOriginal] = useState('')
  const [resultadoOriginal, setResultadoOriginal] = useState('')
  const [deducciones, setDeducciones] = useState('')
  const [filas, setFilas] = useState<FilaUI[]>([filaVacia()])
  const [semilla, setSemilla] = useState(false)

  // Semilla opcional desde los datos reales (bases IVA y deducciones del año)
  useEffect(() => {
    if (semilla || !datosIniciales) return
    setSemilla(true)
    const iniciales: FilaUI[] = []
    const b21 = datosIniciales.base21 ?? 0
    const b10 = datosIniciales.base10 ?? 0
    const b4 = datosIniciales.base4 ?? 0
    const ded = datosIniciales.deducciones ?? 0
    if (b21 > 0) iniciales.push(filaVacia('21', String(b21 / 100)))
    if (b10 > 0) iniciales.push(filaVacia('10', String(b10 / 100)))
    if (b4 > 0) iniciales.push(filaVacia('4', String(b4 / 100)))
    if (iniciales.length > 0) setFilas(iniciales)
    if (ded > 0) setDeducciones(String(ded / 100))
  }, [datosIniciales, semilla])

  const operaciones: Liquidacion309[] = useMemo(
    () =>
      filas
        .filter(f => f.base && parseFloat(f.base) !== 0)
        .map(f => ({ tipo: parseFloat(f.tipo) || 0, baseCents: Math.round(parseFloat(f.base) * 100) })),
    [filas]
  )

  const resultado = useMemo(
    () =>
      calcularModelo309({
        motivo,
        ejercicioOriginal: motivo.startsWith('rectificativa') ? parseInt(ejercicioOriginal, 10) || undefined : undefined,
        periodoOriginal: motivo.startsWith('rectificativa') ? periodoOriginal || undefined : undefined,
        operaciones,
        deduccionesCents: Math.round((parseFloat(deducciones) || 0) * 100),
        resultadoOriginalCents: Math.round((parseFloat(resultadoOriginal) || 0) * 100),
      }),
    [motivo, ejercicioOriginal, periodoOriginal, operaciones, deducciones, resultadoOriginal]
  )

  const update = (id: string, patch: Partial<FilaUI>) =>
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const hasData = operaciones.length > 0

  return (
    <div id="pdf-modelo-309" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-309" filename="modelo-309" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 309 — IVA: declaración-liquidación no periódica</CardTitle>
              <CardDescription>
                No es el régimen simplificado: se usa para liquidar operaciones fuera del 303 periódico y,
                sobre todo, para rectificar autoliquidaciones del 303/322 ya presentadas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m309-motivo" ayuda={GUIA_MODELO_309.motivo}>
                Motivo
              </LabelConAyuda>
              <select
                id="m309-motivo"
                className={selectCls}
                value={motivo}
                onChange={e => setMotivo(e.target.value as Motivo309)}
              >
                {(Object.keys(MOTIVOS_309) as Motivo309[]).map(m => (
                  <option key={m} value={m}>
                    {MOTIVOS_309[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <strong>Plazo:</strong> el del periodo del 303/322 que se rectifica (p. ej. 4º trimestre: hasta
                el 30 de enero).
              </div>
            </div>
          </div>

          {resultado.esRectificativa && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <LabelConAyuda htmlFor="m309-ejercicio" ayuda={GUIA_MODELO_309.periodoOriginal}>
                  Ejercicio original
                </LabelConAyuda>
                <Input
                  id="m309-ejercicio"
                  type="number"
                  min="2000"
                  max="2100"
                  value={ejercicioOriginal}
                  onChange={e => setEjercicioOriginal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="m309-periodo">
                  Periodo original
                </label>
                <Input
                  id="m309-periodo"
                  placeholder="T1, T2, T3, T4 o M01-M12"
                  value={periodoOriginal}
                  onChange={e => setPeriodoOriginal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="m309-resultado-original">
                  Resultado de la autoliquidación original (€)
                </label>
                <Input
                  id="m309-resultado-original"
                  type="number"
                  min="0"
                  step="0.01"
                  value={resultadoOriginal}
                  onChange={e => setResultadoOriginal(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="hidden grid-cols-[1fr_2fr_2rem] gap-3 px-1 text-xs text-muted-foreground sm:grid">
              <span>Tipo (%)</span>
              <span>Base imponible (€) — negativa = soportada</span>
              <span />
            </div>
            {filas.map(f => (
              <div key={f.id} className="grid grid-cols-[1fr] gap-3 sm:grid-cols-[1fr_2fr_2rem] sm:items-center">
                <select className={selectCls} value={f.tipo} onChange={e => update(f.id, { tipo: e.target.value })} aria-label="Tipo impositivo">
                  <option value="21">21 %</option>
                  <option value="10">10 %</option>
                  <option value="4">4 %</option>
                  <option value="0">0 %</option>
                </select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={f.base}
                  onChange={e => update(f.id, { base: e.target.value })}
                  aria-label="Base imponible"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Eliminar operación"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="m309-deducciones">
                Deducciones / regularizaciones (€)
              </label>
              <Input
                id="m309-deducciones"
                type="number"
                min="0"
                step="0.01"
                value={deducciones}
                onChange={e => setDeducciones(e.target.value)}
              />
            </div>
            <div />
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota devengada</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.cuotaDevengadaCents / 100)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Cuota soportada</dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.cuotaSoportadaCents / 100)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">
                  {resultado.esRectificativa ? 'Diferencia vs. original' : 'Liquidación'}
                </dt>
                <dd className="text-lg font-semibold">
                  {formatoEuros((resultado.esRectificativa ? resultado.diferenciaCents : resultado.liquidacionCents) / 100)}
                </dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">
                  {resultado.resultadoCents >= 0 ? 'A ingresar' : 'A devolver'}
                </dt>
                <dd className="text-2xl font-bold text-primary">
                  {formatoEuros(Math.abs(resultado.resultadoCents) / 100)}
                </dd>
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
              Introduce las bases de la liquidación (positivas devengadas, negativas soportadas).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
