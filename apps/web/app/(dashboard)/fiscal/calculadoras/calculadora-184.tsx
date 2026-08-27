'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { eur, parseEuros } from './types'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_184 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo184, TIPOS_ENTIDAD_184 } from '@mantigestor/utils'
import type { TipoEntidad184 } from '@mantigestor/utils'
import { BotonPDF } from '@/components/boton-pdf'

export function CalculadoraModelo184() {
  const [tipo, setTipo] = useState<TipoEntidad184>('sociedad_civil')
  const [participes, setParticipes] = useState('')
  const [rentasInmo, setRentasInmo] = useState('')
  const [rentasMobi, setRentasMobi] = useState('')
  const [rentasActiv, setRentasActiv] = useState('')
  const [rentasGananc, setRentasGananc] = useState('')

  const resultado = useMemo(() => {
    return calcularModelo184({
      tipo,
      participes: parseInt(participes) || 0,
      rentas: {
        inmobiliarias: Math.round((parseEuros(rentasInmo) ?? 0) * 100),
        mobiliarias: Math.round((parseEuros(rentasMobi) ?? 0) * 100),
        actividades: Math.round((parseEuros(rentasActiv) ?? 0) * 100),
        ganancias: Math.round((parseEuros(rentasGananc) ?? 0) * 100),
      },
    })
  }, [tipo, participes, rentasInmo, rentasMobi, rentasActiv, rentasGananc])

  return (
    <div id="pdf-modelo-184" className="space-y-3">
      <BotonPDF elementId="pdf-modelo-184" filename="modelo-184" />
      <Card>
      <CardHeader>
        <CardTitle>Modelo 184 — Atribución de rentas</CardTitle>
        <CardDescription>Entidades en régimen de atribución de rentas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="tipoEntidad" ayuda={GUIA_MODELO_184.tipoEntidad}>Tipo de entidad</LabelConAyuda>
            <select id="tipoEntidad" value={tipo} onChange={e => setTipo(e.target.value as TipoEntidad184)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {TIPOS_ENTIDAD_184.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Nº de socios/partícipes</Label>
            <Input type="number" min="1" value={participes} onChange={e => setParticipes(e.target.value)} placeholder="2" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="rentasInmobiliarias" ayuda={GUIA_MODELO_184.rentasInmobiliarias}>Rentas inmobiliarias (€)</LabelConAyuda>
            <Input id="rentasInmobiliarias" type="number" step="0.01" value={rentasInmo} onChange={e => setRentasInmo(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Rentas mobiliarias (€)</Label>
            <Input type="number" step="0.01" value={rentasMobi} onChange={e => setRentasMobi(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Rentas de actividades (€)</Label>
            <Input type="number" step="0.01" value={rentasActiv} onChange={e => setRentasActiv(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="gananciasPatrimoniales" ayuda={GUIA_MODELO_184.gananciasPatrimoniales}>Ganancias patrimoniales (€)</LabelConAyuda>
            <Input id="gananciasPatrimoniales" type="number" step="0.01" value={rentasGananc} onChange={e => setRentasGananc(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Tipo de entidad</dt>
            <dd className="text-lg font-semibold">{resultado.tipoEntidad}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Nº de partícipes</dt>
            <dd className="text-lg font-semibold">{resultado.numParticipes}</dd>
          </div>
          <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
            <dt className="text-xs text-muted-foreground">Total rentas</dt>
            <dd className="text-lg font-bold text-primary">{eur(resultado.totalRentas)}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Renta por partícipe</dt>
            <dd className="text-lg font-semibold">{eur(resultado.rentaPorParticipe)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    </div>
  )
}
