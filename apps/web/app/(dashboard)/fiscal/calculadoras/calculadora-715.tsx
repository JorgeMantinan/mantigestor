'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_715 } from '@/lib/fiscal/guia-fiscal'
import { SELECT_CLS } from '@/lib/ui-constants'
import { calcularModelo715, PAISES_COMUNES, type InversionExtranjero715 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

const TIPOS_INVERSION: Array<{ valor: InversionExtranjero715['tipo']; label: string }> = [
  { valor: 'valores', label: 'Valores' },
  { valor: 'participaciones', label: 'Participaciones' },
  { valor: 'muebles', label: 'Bienes muebles' },
]

export function CalculadoraModelo715() {
  const [inversiones, setInversiones] = useState<InversionExtranjero715[]>([])

  const [tipo, setTipo] = useState<InversionExtranjero715['tipo']>('valores')
  const [entidad, setEntidad] = useState('')
  const [pais, setPais] = useState('')
  const [fechaAdquisicion, setFechaAdquisicion] = useState('')
  const [valorAdquisicion, setValorAdquisicion] = useState('')
  const [valorActual, setValorActual] = useState('')

  const resultado = useMemo(() => calcularModelo715(inversiones), [inversiones])

  const addInversion = () => {
    if (!entidad || !pais || !fechaAdquisicion || !valorActual) return
    const va = parseEuros(valorAdquisicion)
    const vact = parseEuros(valorActual)
    if (vact === null) return
    setInversiones(prev => [...prev, {
      tipo,
      entidad,
      pais,
      fechaAdquisicion,
      valorAdquisicionCents: va ?? 0,
      valorActualCents: vact,
    }])
    setEntidad(''); setPais(''); setFechaAdquisicion(''); setValorAdquisicion(''); setValorActual('')
  }

  const removeInversion = (idx: number) => setInversiones(prev => prev.filter((_, i) => i !== idx))

  const TOTAL_POR_TIPO = useMemo(() => {
    const map: Record<string, number> = { valores: 0, participaciones: 0, muebles: 0 }
    for (const inv of inversiones) {
      map[inv.tipo] = (map[inv.tipo] ?? 0) + inv.valorActualCents
    }
    return map
  }, [inversiones])

  return (
    <div id="pdf-modelo-715" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-715" filename="modelo-715" />
      <Card>
        <CardHeader>
          <CardTitle>Modelo 715 — Inversiones en el extranjero</CardTitle>
          <CardDescription>
            Declaración informativa obligatoria si el valor total supera 50.000€
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Valores</dt>
              <dd className="font-semibold">{eur(TOTAL_POR_TIPO['valores'] ?? 0)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Participaciones</dt>
              <dd className="font-semibold">{eur(TOTAL_POR_TIPO['participaciones'] ?? 0)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Bienes muebles</dt>
              <dd className="font-semibold">{eur(TOTAL_POR_TIPO['muebles'] ?? 0)}</dd>
            </div>
            <div className={`rounded-lg border p-3 ${resultado.totalGlobal > 50_000_00 ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
              <dt className="text-xs text-muted-foreground">Total global</dt>
              <dd className={`text-lg font-bold ${resultado.totalGlobal > 50_000_00 ? 'text-red-600' : 'text-green-600'}`}>
                {eur(resultado.totalGlobal)}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">N.º inversiones</dt>
              <dd className="font-semibold">{resultado.numInversiones}</dd>
            </div>
          </dl>

          {/* Por país */}
          {Object.keys(resultado.inversionesPorPais).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Por país</h4>
              <div className="space-y-1">
                {Object.entries(resultado.inversionesPorPais).map(([p, v]) => (
                  <div key={p} className="flex justify-between text-sm">
                    <span>{p}</span>
                    <span className="font-medium">{eur(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List */}
          {inversiones.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Inversiones declaradas</h4>
              {inversiones.map((inv, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{inv.entidad}</span>
                    <span className="text-muted-foreground ml-2">{inv.pais}</span>
                    <span className="text-muted-foreground ml-2">
                      {TIPOS_INVERSION.find(t => t.valor === inv.tipo)?.label}
                    </span>
                    <span className="text-muted-foreground ml-2">Adq: {inv.fechaAdquisicion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Adq: {eur(inv.valorAdquisicionCents)}</span>
                    <span className="font-medium">{eur(inv.valorActualCents)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeInversion(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Añadir inversión</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <LabelConAyuda htmlFor="tipo715" ayuda={GUIA_MODELO_715.tipo}>Tipo</LabelConAyuda>
                <select id="tipo715" value={tipo} onChange={e => setTipo(e.target.value as InversionExtranjero715['tipo'])} className={SELECT_CLS}>
                  {TIPOS_INVERSION.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="entidad715" ayuda={GUIA_MODELO_715.entidad}>Entidad / depositario</LabelConAyuda>
                <Input id="entidad715" value={entidad} onChange={e => setEntidad(e.target.value)} placeholder="Interactive Brokers" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="pais715" ayuda={GUIA_MODELO_715.pais}>País</LabelConAyuda>
                <select id="pais715" value={pais} onChange={e => setPais(e.target.value)} className={SELECT_CLS}>
                  <option value="">Seleccionar...</option>
                  {PAISES_COMUNES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="fecha715" ayuda={GUIA_MODELO_715.fechaAdquisicion}>Fecha adquisición</LabelConAyuda>
                <Input id="fecha715" type="date" value={fechaAdquisicion} onChange={e => setFechaAdquisicion(e.target.value)} />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="valorAdq715" ayuda={GUIA_MODELO_715.valorAdquisicion}>Valor adquisición (€)</LabelConAyuda>
                <Input id="valorAdq715" type="number" step="0.01" value={valorAdquisicion} onChange={e => setValorAdquisicion(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="valorAct715" ayuda={GUIA_MODELO_715.valorActual}>Valor actual (€)</LabelConAyuda>
                <Input id="valorAct715" type="number" step="0.01" value={valorActual} onChange={e => setValorActual(e.target.value)} placeholder="0.00" />
              </div>
              <div className="flex items-end">
                <Button type="button" size="sm" onClick={addInversion} disabled={!entidad || !pais || !fechaAdquisicion || !valorActual}>
                  <Plus className="mr-1 h-3 w-3" /> Añadir
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
