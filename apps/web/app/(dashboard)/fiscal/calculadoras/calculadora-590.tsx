'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Link2, Plus, Trash2, FileWarning } from 'lucide-react'
import { calcularModelo590, type OperacionVinculada590 } from '@mantigestor/utils'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_590 } from '@/lib/fiscal/guia-fiscal'
import { BotonPDF } from '@/components/boton-pdf'

const formatoEuros = (euros: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(euros)

interface Fila {
  id: string
  tipo: OperacionVinculada590['tipo']
  importe: string
}

const TIPOS: Array<{ value: OperacionVinculada590['tipo']; label: string }> = [
  { value: 'servicios', label: 'Servicios' },
  { value: 'financieras', label: 'Financieras' },
  { value: 'venta_bienes', label: 'Venta de bienes' },
  { value: 'compra_bienes', label: 'Compra de bienes' },
  { value: 'otras', label: 'Otras' },
]

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50'

export function CalculadoraModelo590() {
  const [cifra, setCifra] = useState('')
  const [filas, setFilas] = useState<Fila[]>([])

  const addFila = () =>
    setFilas((prev) => [
      ...prev,
      { id: crypto.randomUUID(), tipo: 'servicios' as const, importe: '' },
    ])

  const updateFila = (id: string, patch: Partial<Fila>) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const removeFila = (id: string) => setFilas((prev) => prev.filter((f) => f.id !== id))

  const operaciones: OperacionVinculada590[] = useMemo(
    () =>
      filas
        .map((f) => ({ tipo: f.tipo, importe: parseFloat(f.importe) || 0 }))
        .filter((o) => o.importe > 0),
    [filas]
  )

  const resultado = useMemo(
    () => calcularModelo590({ cifraNegocios: parseFloat(cifra) || 0, operaciones }),
    [cifra, operaciones]
  )

  const hasData = parseFloat(cifra) > 0 && operaciones.length > 0

  return (
    <div id="pdf-modelo-590" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-590" filename="modelo-590" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <CardTitle>Modelo 590 — Operaciones vinculadas</CardTitle>
              <CardDescription>
                Declaración informativa de operaciones con partes vinculadas (art. 18 LIS). Determina si
                estás obligado a presentarlo y a elaborar documentación.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-lg">
            <div className="space-y-2">
              <LabelConAyuda htmlFor="m590-cifra" ayuda={GUIA_MODELO_590.cifraNegocios}>Cifra de negocios (€)</LabelConAyuda>
              <Input id="m590-cifra" type="number" min="0" step="0.01" placeholder="1000000" value={cifra} onChange={e => setCifra(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={addFila} variant="outline" className="gap-1.5" disabled={filas.length >= 8}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Añadir operación
              </Button>
            </div>
          </div>

          {filas.length > 0 && (
            <div className="space-y-2">
              {filas.map((f) => (
                <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-center">
                  <select
                    className={selectCls}
                    value={f.tipo}
                    onChange={e => updateFila(f.id, { tipo: e.target.value as OperacionVinculada590['tipo'] })}
                    aria-label="Tipo de operación"
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Importe (€)"
                    value={f.importe}
                    onChange={e => updateFila(f.id, { importe: e.target.value })}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFila(f.id)} aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {filas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Añade las operaciones realizadas con partes vinculadas (la suma indicará si superas el umbral).
            </p>
          )}

          {hasData && (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Total operaciones vinculadas</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.totalOperaciones)}</dd>
                </div>
                <div className={`rounded-lg border p-3 ${resultado.debePresentar ? 'border-amber-500/50 bg-amber-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
                  <dt className="text-xs text-muted-foreground">¿Debe presentar el 590?</dt>
                  <dd className={`text-lg font-bold ${resultado.debePresentar ? 'text-amber-600' : 'text-green-600'}`}>
                    {resultado.debePresentar ? 'Sí' : 'No'}
                  </dd>
                </div>
                <div className={`rounded-lg border p-3 ${resultado.debeDocumentar ? 'border-amber-500/50 bg-amber-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
                  <dt className="text-xs text-muted-foreground">¿Documentación obligatoria?</dt>
                  <dd className={`text-lg font-bold ${resultado.debeDocumentar ? 'text-amber-600' : 'text-green-600'}`}>
                    {resultado.debeDocumentar ? 'Sí' : 'No'}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">Umbral de presentación</dt>
                  <dd className="text-lg font-semibold">{formatoEuros(resultado.umbralPresentacion)}</dd>
                </div>
              </dl>

              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-right font-medium">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.porTipo.filter((p) => p.importe > 0).map((p) => (
                      <tr key={p.tipo} className="border-b">
                        <td className="px-3 py-2">{p.etiqueta}</td>
                        <td className="px-3 py-2 text-right">{formatoEuros(p.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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

          <p className="text-xs text-muted-foreground">
            El 590 es una declaración informativa (no se ingresa cuota). Se presenta en el mes siguiente al
            cierre del periodo impositivo. La documentación aplica al superar 10 M€ de cifra de negocios y
            operaciones vinculadas que superen 250.000 €.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
