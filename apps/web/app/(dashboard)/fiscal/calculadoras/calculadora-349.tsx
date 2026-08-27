'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_349 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo349 } from '@mantigestor/utils'
import type { OperacionIntracomunitaria } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

const PAISES_UE = [
  'Alemania', 'Austria', 'Bélgica', 'Bulgaria', 'Croacia',
  'Dinamarca', 'Eslovaquia', 'Eslovenia', 'Estonia', 'Finlandia',
  'Francia', 'Grecia', 'Hungría', 'Irlanda', 'Italia',
  'Letonia', 'Lituania', 'Luxemburgo', 'Malta', 'Países Bajos',
  'Polonia', 'Portugal', 'República Checa', 'Rumanía', 'Suecia',
]

export function CalculadoraModelo349({ datosIniciales }: { datosIniciales?: { operaciones?: Array<{ tercero: string; nif: string; pais: string; tipo: string; baseImponible: number }> } } = {}) {
  const [operaciones, setOperaciones] = useState<OperacionIntracomunitaria[]>(() => {
    if (!datosIniciales?.operaciones) return []
    return datosIniciales.operaciones.map(op => ({
      tercero: op.tercero,
      nif: op.nif,
      pais: op.pais,
      tipo: op.tipo as OperacionIntracomunitaria['tipo'],
      baseImponible: op.baseImponible,
    }))
  })
  const [tercero, setTercero] = useState('')
  const [nif, setNif] = useState('')
  const [pais, setPais] = useState('')
  const [tipo, setTipo] = useState<OperacionIntracomunitaria['tipo']>('entrega')
  const [baseImponible, setBaseImponible] = useState('')
  const [periodo, setPeriodo] = useState<'trimestral' | 'mensual'>('trimestral')

  const resultado = useMemo(() => calcularModelo349({ operaciones, periodo }), [operaciones, periodo])

  const addOperacion = () => {
    const base = parseEuros(baseImponible)
    if (!tercero || !nif || !pais || base === null) return

    setOperaciones(prev => [...prev, {
      tercero,
      nif,
      pais,
      tipo,
      baseImponible: base,
    }])
    setTercero('')
    setNif('')
    setBaseImponible('')
  }

  const removeOperacion = (idx: number) => {
    setOperaciones(prev => prev.filter((_, i) => i !== idx))
  }

  const labels: Record<OperacionIntracomunitaria['tipo'], string> = {
    entrega: 'Entrega',
    adquisicion: 'Adquisición',
    servicios: 'Servicios',
  }

  return (
    <div id="pdf-modelo-349" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-349" filename="modelo-349" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 349 — Operaciones intracomunitarias UE</CardTitle>
        <CardDescription>
          Declaración informativa de operaciones con empresarios/profesionales de otros estados miembros
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label>Periodo</Label>
          <select value={periodo} onChange={e => setPeriodo(e.target.value as 'trimestral' | 'mensual')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="trimestral">Trimestral</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="tercero" ayuda={GUIA_MODELO_349.tercero}>Tercero</LabelConAyuda>
            <Input id="tercero" value={tercero} onChange={e => setTercero(e.target.value)} placeholder="Nombre o razón social" />
          </div>
          <div className="space-y-2">
            <Label>NIF</Label>
            <Input value={nif} onChange={e => setNif(e.target.value)} placeholder="DE123456789" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="pais" ayuda={GUIA_MODELO_349.pais}>País</LabelConAyuda>
            <select id="pais" value={pais} onChange={e => setPais(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Seleccionar...</option>
              {PAISES_UE.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select value={tipo} onChange={e => setTipo(e.target.value as OperacionIntracomunitaria['tipo'])}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="entrega">Entrega</option>
              <option value="adquisicion">Adquisición</option>
              <option value="servicios">Servicios</option>
            </select>
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="baseImponible" ayuda={GUIA_MODELO_349.baseImponible}>Base imponible (€)</LabelConAyuda>
            <Input id="baseImponible" type="number" step="0.01" value={baseImponible} onChange={e => setBaseImponible(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <Button variant="outline" onClick={addOperacion} disabled={!tercero || !nif || !pais}>
          Añadir operación
        </Button>

        {operaciones.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Operaciones ({operaciones.length})</h4>
            <div className="space-y-2">
              {operaciones.map((op, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{op.tercero}</span>
                    <span className="text-muted-foreground ml-2">{op.nif} · {op.pais}</span>
                    <span className="text-muted-foreground ml-2">— {labels[op.tipo]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{eur(op.baseImponible)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeOperacion(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total entregas</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalEntregas)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total adquisiciones</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalAdquisiciones)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total servicios</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalServicios)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Nº de operaciones</dt>
            <dd className="text-lg font-semibold">{resultado.numOperaciones}</dd>
          </div>
          <div className={`rounded-lg border p-3 sm:col-span-2 ${resultado.debePresentar ? 'border-blue-500/50 bg-blue-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <dt className="text-xs text-muted-foreground">Resultado</dt>
            <dd className={`font-bold ${resultado.debePresentar ? 'text-blue-600' : 'text-green-600'}`}>
              {resultado.resumen}
            </dd>
          </div>
        </dl>

        {Object.keys(resultado.porPais).length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Desglose por país</h4>
            <div className="space-y-1">
              {Object.entries(resultado.porPais).map(([p, datos]) => (
                <div key={p} className="flex justify-between text-sm">
                  <span>{p}</span>
                  <span className="font-medium">
                    Entregas: {eur(datos.entregas)} · Adquisiciones: {eur(datos.adquisiciones)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
