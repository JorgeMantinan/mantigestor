'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LabelConAyuda } from './label-con-ayuda'
import { GUIA_MODELO_131 } from '@/lib/fiscal/guia-fiscal'
import { calcularModelo151, requisitosEstimacionObjetiva } from '@mantigestor/utils'

export function CalculadoraModelo151() {
  const [tipo, setTipo] = useState<'alta' | 'renuncia' | 'revocacion'>('alta')
  const [nif, setNif] = useState('')
  const [nombre, setNombre] = useState('')
  const [actividad, setActividad] = useState('')
  const [codigoIae, setCodigoIae] = useState('')

  const resultado = useMemo(() =>
    calcularModelo151({ tipo, nif, nombre, actividad, codigoActividad: codigoIae }),
    [tipo, nif, nombre, actividad, codigoIae]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelo 151 — Estimación objetiva (módulos)</CardTitle>
        <CardDescription>Alta, renuncia o revocación del régimen de módulos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm space-y-2">
          <Label>Tipo de comunicación</Label>
          <select value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="alta">Alta</option>
            <option value="renuncia">Renuncia</option>
            <option value="revocacion">Revocación</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <LabelConAyuda htmlFor="nif" ayuda={GUIA_MODELO_131.moduloAnual}>NIF</LabelConAyuda>
            <Input id="nif" value={nif} onChange={e => setNif(e.target.value)} placeholder="12345678A" />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="nombre" ayuda={GUIA_MODELO_131.kcalAnuales}>Nombre / denominación</LabelConAyuda>
            <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre o empresa" />
          </div>
          <div className="space-y-2">
            <Label>Actividad económica</Label>
            <Input value={actividad} onChange={e => setActividad(e.target.value)} placeholder="Ej: Hostelería, Comercio..." />
          </div>
          <div className="space-y-2">
            <LabelConAyuda htmlFor="codigoIAE" ayuda={GUIA_MODELO_131.personal}>Código IAE</LabelConAyuda>
            <Input id="codigoIAE" value={codigoIae} onChange={e => setCodigoIae(e.target.value)} placeholder="Ej: 4711" />
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${resultado.observaciones.some(o => o.includes('⚠️')) ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
          <h4 className="font-medium">{resultado.tipo}: {resultado.descripcion}</h4>
          <p className="text-sm text-muted-foreground mt-1">Plazo: {resultado.plazo}</p>
          <ul className="mt-2 space-y-1">
            {resultado.observaciones.map((obs, i) => (
              <li key={i} className="text-sm">{obs}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border p-4">
          <h4 className="font-medium text-sm mb-2">Requisitos generales para estimación objetiva</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {requisitosEstimacionObjetiva().map((req, i) => (
              <li key={i}>• {req}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
