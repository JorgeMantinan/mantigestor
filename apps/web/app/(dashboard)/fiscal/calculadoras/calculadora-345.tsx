'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { eur, parseEuros } from './types'
import { calcularModelo345 } from '@mantigestor/utils'
import type { ContribucionPlan } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

const TIPOS_PLAN: Array<{ value: ContribucionPlan['tipoPlan']; label: string }> = [
  { value: 'pension', label: 'Plan de pensiones' },
  { value: 'ahorro_largo_plazo', label: 'Ahorro a largo plazo' },
  { value: 'prevision_social', label: 'Previsión social' },
  { value: 'mutualidad', label: 'Mutualidad' },
  { value: 'pension_empresa', label: 'Previsión empresarial' },
  { value: 'pension_empleo', label: 'Pensión de empleo' },
]

export function CalculadoraModelo345({ taxYear }: { taxYear: number }) {
  const [contribuciones, setContribuciones] = useState<ContribucionPlan[]>([])
  const [tipoPlan, setTipoPlan] = useState<ContribucionPlan['tipoPlan']>('pension')
  const [titularNif, setTitularNif] = useState('')
  const [titularNombre, setTitularNombre] = useState('')
  const [contribucionEmpresa, setContribucionEmpresa] = useState('')
  const [contribucionTrabajador, setContribucionTrabajador] = useState('')
  const [contribucionesDisposicion, setContribucionesDisposicion] = useState('')
  const [valorLiquido, setValorLiquido] = useState('')

  const resultado = useMemo(() => calcularModelo345({ ejercicio: taxYear, contribuciones }), [taxYear, contribuciones])

  const addContribucion = () => {
    const empresa = parseEuros(contribucionEmpresa) ?? 0
    const trabajador = parseEuros(contribucionTrabajador) ?? 0
    if (!titularNif || !titularNombre || (empresa === 0 && trabajador === 0)) return

    setContribuciones(prev => [...prev, {
      tipoPlan,
      titularNif,
      titularNombre,
      contribucionEmpresa: empresa,
      contribucionTrabajador: trabajador,
      contribucionesDisposicion: parseEuros(contribucionesDisposicion) ?? 0,
      valorLiquido: parseEuros(valorLiquido) ?? 0,
    }])
    setTitularNif('')
    setTitularNombre('')
    setContribucionEmpresa('')
    setContribucionTrabajador('')
    setContribucionesDisposicion('')
    setValorLiquido('')
  }

  const removeContribucion = (idx: number) => {
    setContribuciones(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div id="pdf-modelo-345" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-345" filename="modelo-345" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 345 — Planes de pensiones</CardTitle>
        <CardDescription>
          Información sobre planes de pensiones, ahorro a largo plazo, previsión social y mutualidades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de plan</Label>
            <select
              value={tipoPlan}
              onChange={e => setTipoPlan(e.target.value as ContribucionPlan['tipoPlan'])}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {TIPOS_PLAN.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>NIF del titular</Label>
            <Input value={titularNif} onChange={e => setTitularNif(e.target.value)} placeholder="12345678A" />
          </div>
          <div className="space-y-2">
            <Label>Nombre del titular</Label>
            <Input value={titularNombre} onChange={e => setTitularNombre(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="space-y-2">
            <Label>Contribución empresa (€)</Label>
            <Input type="number" step="0.01" value={contribucionEmpresa} onChange={e => setContribucionEmpresa(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Contribución trabajador (€)</Label>
            <Input type="number" step="0.01" value={contribucionTrabajador} onChange={e => setContribucionTrabajador(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Disposiciones (€)</Label>
            <Input type="number" step="0.01" value={contribucionesDisposicion} onChange={e => setContribucionesDisposicion(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Valor líquido (€)</Label>
            <Input type="number" step="0.01" value={valorLiquido} onChange={e => setValorLiquido(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <Button variant="outline" onClick={addContribucion} disabled={!titularNif || !titularNombre}>
          Añadir titular
        </Button>

        {contribuciones.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Titulares ({contribuciones.length})</h4>
            <div className="space-y-2">
              {contribuciones.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{c.titularNombre}</span>
                    <span className="text-muted-foreground ml-2">{c.titularNif}</span>
                    <span className="text-muted-foreground ml-2">
                      — Empresa: {eur(c.contribucionEmpresa)} / Trabajador: {eur(c.contribucionTrabajador)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{eur(c.valorLiquido)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeContribucion(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Titulares</dt>
            <dd className="text-lg font-semibold">{resultado.numTitulares}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total contribuciones empresa</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalContribucionesEmpresa)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total contribuciones trabajador</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalContribucionesTrabajador)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Total disposiciones</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalDisposiciones)}</dd>
          </div>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Valor líquido total</dt>
            <dd className="text-lg font-semibold">{eur(resultado.totalValorLiquido)}</dd>
          </div>
          <div className="rounded-lg border p-3 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Resumen</dt>
            <dd className="font-bold">{resultado.resumen}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    </div>
  )
}
