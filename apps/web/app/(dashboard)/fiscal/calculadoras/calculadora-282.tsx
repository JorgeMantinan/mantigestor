'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_282 } from '@/lib/fiscal/guia-fiscal'
import { SELECT_CLS } from '@/lib/ui-constants'
import {
  calcularModelo282,
  type EntidadTransparencia282,
  type RentaImputada282,
  type Participacion282,
} from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

const TIPOS_ENTIDAD = ['Fondo de inversión', 'SICAV', 'FICVM', 'SOCIMI', 'Otro']
const TIPOS_RENTA = ['Dividendos', 'Intereses', 'Plusvalías', 'Rentas arrendamiento', 'Otras']

export function CalculadoraModelo282() {
  const [razonSocial, setRazonSocial] = useState('')
  const [nif, setNif] = useState('')
  const [tipoEntidad, setTipoEntidad] = useState('Fondo de inversión')

  const [rentas, setRentas] = useState<RentaImputada282[]>([])
  const [participaciones, setParticipaciones] = useState<Participacion282[]>([])

  // Form — renta
  const [rTipo, setRTipo] = useState('Dividendos')
  const [rImporte, setRImporte] = useState('')

  // Form — participación
  const [pSociedad, setPSociedad] = useState('')
  const [pNif, setPNif] = useState('')
  const [pPorcentaje, setPPorcentaje] = useState('')

  const entidad: EntidadTransparencia282 = useMemo(
    () => ({ razonSocial, nif, tipoEntidad, rentasImputadas: rentas, participaciones }),
    [razonSocial, nif, tipoEntidad, rentas, participaciones],
  )

  const resultado = useMemo(() => calcularModelo282(entidad), [entidad])

  const addRenta = () => {
    if (!rImporte) return
    const importe = parseEuros(rImporte)
    if (importe === null) return
    setRentas(prev => [...prev, { tipo: rTipo, importeCents: importe }])
    setRImporte('')
  }

  const addParticipacion = () => {
    if (!pSociedad || !pPorcentaje) return
    const pct = parseFloat(pPorcentaje)
    if (isNaN(pct) || pct <= 0) return
    setParticipaciones(prev => [...prev, { sociedad: pSociedad, nif: pNif, porcentaje: pct }])
    setPSociedad(''); setPNif(''); setPPorcentaje('')
  }

  const removeRenta = (idx: number) => setRentas(prev => prev.filter((_, i) => i !== idx))
  const removeParticipacion = (idx: number) => setParticipaciones(prev => prev.filter((_, i) => i !== idx))

  return (
    <div id="pdf-modelo-282" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-282" filename="modelo-282" />
      <Card>
        <CardHeader>
          <CardTitle>Modelo 282 — Sociedades transparentes</CardTitle>
          <CardDescription>
            Declaración informativa de entidades en régimen de transparencia fiscal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Datos entidad */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Datos de la entidad</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <LabelConAyuda htmlFor="razonSocial" ayuda={GUIA_MODELO_282.razonSocial}>Razón social</LabelConAyuda>
                <Input id="razonSocial" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Fondo Inversión XYZ" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="nif282" ayuda={GUIA_MODELO_282.nif}>NIF</LabelConAyuda>
                <Input id="nif282" value={nif} onChange={e => setNif(e.target.value)} placeholder="B12345678" />
              </div>
              <div className="space-y-1">
                <LabelConAyuda htmlFor="tipoEntidad" ayuda={GUIA_MODELO_282.tipoEntidad}>Tipo de entidad</LabelConAyuda>
                <select id="tipoEntidad" value={tipoEntidad} onChange={e => setTipoEntidad(e.target.value)} className={SELECT_CLS}>
                  {TIPOS_ENTIDAD.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">Total rentas imputadas</dt>
              <dd className="font-semibold">{eur(resultado.totalRentasImputadas)}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">N.º participaciones</dt>
              <dd className="font-semibold">{resultado.numParticipaciones}</dd>
            </div>
          </dl>

          {/* Rentas imputadas */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Rentas imputadas ({resultado.numRentas})</h4>
            {rentas.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{r.tipo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{eur(r.importeCents)}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeRenta(i)}>✕</Button>
                </div>
              </div>
            ))}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Añadir renta imputada</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <LabelConAyuda htmlFor="rTipo" ayuda={GUIA_MODELO_282.tipoRenta}>Tipo de renta</LabelConAyuda>
                  <select id="rTipo" value={rTipo} onChange={e => setRTipo(e.target.value)} className={SELECT_CLS}>
                    {TIPOS_RENTA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <LabelConAyuda htmlFor="rImporte" ayuda={GUIA_MODELO_282.importeRenta}>Importe (€)</LabelConAyuda>
                  <Input id="rImporte" type="number" step="0.01" value={rImporte} onChange={e => setRImporte(e.target.value)} placeholder="0.00" />
                </div>
                <div className="flex items-end">
                  <Button type="button" size="sm" onClick={addRenta} disabled={!rImporte}>
                    <Plus className="mr-1 h-3 w-3" /> Añadir
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Participaciones */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Participaciones ({participaciones.length})</h4>
            {participaciones.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{p.sociedad}</span>
                  {p.nif && <span className="text-muted-foreground ml-2">NIF: {p.nif}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span>{p.porcentaje}%</span>
                  <Button variant="ghost" size="sm" onClick={() => removeParticipacion(i)}>✕</Button>
                </div>
              </div>
            ))}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Añadir participación</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <LabelConAyuda htmlFor="pSociedad" ayuda={GUIA_MODELO_282.sociedad}>Sociedad</LabelConAyuda>
                  <Input id="pSociedad" value={pSociedad} onChange={e => setPSociedad(e.target.value)} placeholder="Empresa ABC, S.L." />
                </div>
                <div className="space-y-1">
                  <LabelConAyuda htmlFor="pNif" ayuda={GUIA_MODELO_282.nif}>NIF</LabelConAyuda>
                  <Input id="pNif" value={pNif} onChange={e => setPNif(e.target.value)} placeholder="B12345678" />
                </div>
                <div className="space-y-1">
                  <LabelConAyuda htmlFor="pPorcentaje" ayuda={GUIA_MODELO_282.porcentaje}>Participación (%)</LabelConAyuda>
                  <Input id="pPorcentaje" type="number" step="0.01" value={pPorcentaje} onChange={e => setPPorcentaje(e.target.value)} placeholder="25" />
                </div>
                <div className="flex items-end">
                  <Button type="button" size="sm" onClick={addParticipacion} disabled={!pSociedad || !pPorcentaje}>
                    <Plus className="mr-1 h-3 w-3" /> Añadir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
