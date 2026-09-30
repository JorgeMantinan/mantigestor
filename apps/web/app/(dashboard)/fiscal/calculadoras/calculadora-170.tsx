'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Smartphone, Plus, Trash2, FileWarning, CalendarClock } from 'lucide-react'
import { calcularModelo170, type MedioCobro170, type Operacion170 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_170 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

interface FilaUI {
  id: string
  fecha: string
  importe: string
  medio: MedioCobro170
}

interface Props {
  taxYear: number
}

export function CalculadoraModelo170({ taxYear }: Props) {
  const mensual = taxYear >= 2026
  const [mes, setMes] = useState<number>(1)
  const [filas, setFilas] = useState<FilaUI[]>([
    { id: crypto.randomUUID(), fecha: `${taxYear}-01-15`, importe: '', medio: 'tarjeta' },
  ])

  const operaciones: Operacion170[] = useMemo(
    () =>
      filas
        .filter(f => f.fecha && parseFloat(f.importe) > 0)
        .map(f => ({
          fecha: f.fecha,
          importeCents: Math.round((parseFloat(f.importe) || 0) * 100),
          medio: f.medio,
        })),
    [filas]
  )

  const resultado = useMemo(
    () => calcularModelo170({ anyo: taxYear, mes: mensual ? mes : undefined, operaciones }),
    [taxYear, mensual, mes, operaciones]
  )

  const update = (id: string, patch: Partial<FilaUI>) =>
    setFilas(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))

  const hasData = operaciones.length > 0

  return (
    <div id="pdf-modelo-170" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-170" filename="modelo-170" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle className="flex items-center gap-2">
                Modelo 170 — Cobros con tarjeta y móvil {taxYear}
                <Badge variant={mensual ? 'default' : 'secondary'}>
                  {mensual ? 'Mensual (≥ 2026)' : 'Anual (≤ 2025)'}
                </Badge>
              </CardTitle>
              <CardDescription>
                {mensual
                  ? 'Declaración informativa mensual de las operaciones de cobro a través de cualquier tipo de tarjeta y de pagos asociados a números de teléfono móvil (Orden HAC/747/2025).'
                  : 'Declaración informativa anual de las operaciones de cobro a través de tarjetas de crédito o de débito (Orden EHA/97/2010, derogada con efectos 1-1-2026).'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`grid gap-4 ${mensual ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
            {mensual && (
              <div className="space-y-2">
                <LabelConAyuda htmlFor="m170-mes" ayuda={GUIA_MODELO_170.periodo}>
                  Mes de la declaración
                </LabelConAyuda>
                <select id="m170-mes" className={selectCls} value={mes} onChange={e => setMes(Number(e.target.value))}>
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m} {taxYear}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end">
              <div className="flex w-full items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>Plazo:</strong> {resultado.plazo}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="hidden grid-cols-[1fr_1fr_1fr_2rem] gap-3 px-1 text-xs text-muted-foreground sm:grid">
              <span>Fecha</span>
              <span>Importe cobrado (€)</span>
              <span>Medio de cobro</span>
              <span />
            </div>
            {filas.map(f => (
              <div key={f.id} className="grid grid-cols-[1fr] gap-3 sm:grid-cols-[1fr_1fr_1fr_2rem] sm:items-center">
                <Input
                  type="date"
                  value={f.fecha}
                  min={`${taxYear}-01-01`}
                  max={`${taxYear}-12-31`}
                  onChange={e => update(f.id, { fecha: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="250.00"
                  value={f.importe}
                  onChange={e => update(f.id, { importe: e.target.value })}
                />
                <select
                  className={selectCls}
                  value={f.medio}
                  onChange={e => update(f.id, { medio: e.target.value as MedioCobro170 })}
                >
                  <option value="tarjeta">Tarjeta (crédito/débito/TPV)</option>
                  <option value="movil" disabled={!mensual}>
                    Pago con móvil {mensual ? '' : '(solo desde 2026)'}
                  </option>
                </select>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilas(prev => [
                  ...prev,
                  { id: crypto.randomUUID(), fecha: `${taxYear}-01-15`, importe: '', medio: 'tarjeta' },
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Añadir cobro
            </Button>
          </div>

          {hasData && (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" aria-hidden="true" /> Con tarjeta
                </dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.totalTarjetaCents / 100)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> Con móvil
                </dt>
                <dd className="text-lg font-semibold">{formatoEuros(resultado.totalMovilCents / 100)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Operaciones</dt>
                <dd className="text-lg font-semibold">{resultado.numOperaciones}</dd>
              </div>
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <dt className="text-xs text-muted-foreground">Total declarado</dt>
                <dd className="text-2xl font-bold text-primary">{formatoEuros(resultado.totalCents / 100)}</dd>
              </div>
            </dl>
          )}

          {hasData && !mensual && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Importes por mes (resumen anual)</p>
              <div className="grid grid-cols-3 gap-1 text-xs sm:grid-cols-6">
                {resultado.porMes.map((importe, i) => (
                  <div key={MESES[i]} className="rounded border p-1.5 text-center">
                    <p className="text-muted-foreground">{MESES[i]?.slice(0, 3)}</p>
                    <p className="font-medium">{formatoEuros(importe / 100)}</p>
                  </div>
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
              Añade los cobros realizados con tarjeta{mensual ? ' y móvil' : ''} del ejercicio {taxYear} para
              calcular la declaración informativa.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
