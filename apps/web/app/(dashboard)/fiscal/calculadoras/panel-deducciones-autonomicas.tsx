'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { eur, parseEuros, type DatosFiscales } from './types'
import type { DeduccionAutonomica } from '@/lib/fiscal/datos'

interface EntradaDeducciones {
  hijosMenores3: number
  hijos3a25: number
  hijosDiscapacidad: number
  familiaNumerosa: boolean
  familiaNumerosaEspecial: boolean
  ascendientesMayores65: boolean
  alquilerMensual: string
  baseImponibleGeneral: number
}

function calcularDeduccion(
  deduccion: DeduccionAutonomica,
  entrada: EntradaDeducciones,
): number {
  const { tipo, importeBaseCents, porcentaje, importeMaxCents, rentaMaximaCents } = deduccion
  const renta = entrada.baseImponibleGeneral

  // Reducción lineal por renta si hay rentaMaximaCents
  let factorReduccion = 1
  if (rentaMaximaCents != null && renta > 0) {
    if (renta >= rentaMaximaCents) return 0
    // Reducción lineal desde 0 hasta rentaMaximaCents
    // (simplificación: plena deducción hasta un umbral implícito, luego lineal)
    // Usamos la fórmula estándar: deducción × (rentaMax - renta) / (rentaMax - rentaMin)
    // Sin rentaMin definida, asumimos que la reducción es lineal desde 0
    factorReduccion = Math.max(0, (rentaMaximaCents - renta) / rentaMaximaCents)
  }

  switch (tipo) {
    case 'nacimiento':
    case 'nacimiento_adopcion': {
      const totalHijos = entrada.hijosMenores3 + entrada.hijos3a25
      if (totalHijos <= 0) return 0
      const importe = (importeBaseCents ?? 0) * totalHijos
      const conDiscapacidad = entrada.hijosDiscapacidad > 0 ? importe : 0
      const total = importe + conDiscapacidad
      const conReduccion = Math.round(total * factorReduccion)
      return importeMaxCents != null ? Math.min(conReduccion, importeMaxCents) : conReduccion
    }
    case 'familia_numerosa':
    case 'familia_numerosa_especial': {
      if (!entrada.familiaNumerosa && !entrada.familiaNumerosaEspecial) return 0
      if (tipo === 'familia_numerosa' && entrada.familiaNumerosaEspecial) return 0
      if (tipo === 'familia_numerosa_especial' && !entrada.familiaNumerosaEspecial) return 0
      // Porcentaje sobre cuota autonómica — devolvemos el porcentaje como referencia
      // El cálculo real requiere la cuota autonómica
      return importeBaseCents != null ? Math.round(importeBaseCents * factorReduccion) : 0
    }
    case 'ascendientes':
    case 'ascendientes_mayores': {
      if (!entrada.ascendientesMayores65) return 0
      return importeBaseCents != null ? Math.round(importeBaseCents * factorReduccion) : 0
    }
    case 'alquiler': {
      const alquilerMensual = parseEuros(entrada.alquilerMensual)
      if (alquilerMensual === null || alquilerMensual <= 0) return 0
      const gastoAnual = alquilerMensual * 12 * 100 // a céntimos
      const deduccion = porcentaje != null ? Math.round(gastoAnual * (porcentaje / 100)) : 0
      const conMax = importeMaxCents != null ? Math.min(deduccion, importeMaxCents) : deduccion
      return Math.round(conMax * factorReduccion)
    }
    case 'discapacidad_contribuyente':
    case 'discapacidad': {
      // Se aplica si el usuario tiene discapacidad (simplificación)
      return 0 // Requiere input adicional del usuario
    }
    default:
      return importeBaseCents != null ? Math.round(importeBaseCents * factorReduccion) : 0
  }
}

export function PanelDeduccionesAutonomicas({ datos }: { datos: DatosFiscales }) {
  const [entrada, setEntrada] = useState<EntradaDeducciones>({
    hijosMenores3: 0,
    hijos3a25: 0,
    hijosDiscapacidad: 0,
    familiaNumerosa: false,
    familiaNumerosaEspecial: false,
    ascendientesMayores65: false,
    alquilerMensual: '',
    baseImponibleGeneral: 0,
  })

  const resultados = useMemo(() => {
    if (!datos.deduccionesAutonomicas.length) return []
    return datos.deduccionesAutonomicas.map(d => ({
      deduccion: d,
      importeCents: calcularDeduccion(d, entrada),
    })).filter(r => r.importeCents > 0)
  }, [datos.deduccionesAutonomicas, entrada])

  const totalDeduccionesCents = resultados.reduce((acc, r) => acc + r.importeCents, 0)

  if (!datos.deduccionesAutonomicas.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deducciones autonómicas</CardTitle>
          <CardDescription>No hay deducciones disponibles para esta comunidad.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const tiposUnicos = [...new Set(datos.deduccionesAutonomicas.map(d => d.tipo))]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deducciones autonómicas · {datos.deduccionesAutonomicas[0]?.comunidad}</CardTitle>
        <CardDescription>
          {datos.deduccionesAutonomicas.length} deducciones disponibles. Introduce tus datos para estimar las deducciones aplicables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiposUnicos.includes('nacimiento') && (
            <>
              <div className="space-y-1">
                <Label htmlFor="hijos-m3">Hijos menores de 3 años</Label>
                <Input id="hijos-m3" type="number" min="0" value={entrada.hijosMenores3}
                  onChange={e => setEntrada(p => ({ ...p, hijosMenores3: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hijos-3a25">Hijos de 3 a 25 años</Label>
                <Input id="hijos-3a25" type="number" min="0" value={entrada.hijos3a25}
                  onChange={e => setEntrada(p => ({ ...p, hijos3a25: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hijos-disc">Hijos con discapacidad</Label>
                <Input id="hijos-disc" type="number" min="0" value={entrada.hijosDiscapacidad}
                  onChange={e => setEntrada(p => ({ ...p, hijosDiscapacidad: parseInt(e.target.value) || 0 }))} />
              </div>
            </>
          )}
          {tiposUnicos.some(t => t.startsWith('familia')) && (
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={entrada.familiaNumerosa}
                  onChange={e => setEntrada(p => ({ ...p, familiaNumerosa: e.target.checked }))} />
                Familia numerosa
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={entrada.familiaNumerosaEspecial}
                  onChange={e => setEntrada(p => ({ ...p, familiaNumerosaEspecial: e.target.checked }))} />
                Especial
              </label>
            </div>
          )}
          {tiposUnicos.some(t => t.startsWith('ascend')) && (
            <label className="flex items-center gap-2 text-sm pb-1">
              <input type="checkbox" checked={entrada.ascendientesMayores65}
                onChange={e => setEntrada(p => ({ ...p, ascendientesMayores65: e.target.checked }))} />
              Ascendientes &gt;65 años
            </label>
          )}
          {tiposUnicos.includes('alquiler') && (
            <div className="space-y-1">
              <Label htmlFor="alquiler-mes">Alquiler mensual (€)</Label>
              <Input id="alquiler-mes" type="number" min="0" step="0.01" placeholder="800"
                value={entrada.alquilerMensual}
                onChange={e => setEntrada(p => ({ ...p, alquilerMensual: e.target.value }))} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="base-imp">Base imponible general (€)</Label>
            <Input id="base-imp" type="number" min="0" step="0.01" placeholder="30000"
              value={entrada.baseImponibleGeneral || ''}
              onChange={e => {
                const val = parseEuros(e.target.value)
                setEntrada(p => ({ ...p, baseImponibleGeneral: val != null ? val * 100 : 0 }))
              }} />
          </div>
        </div>

        {resultados.length > 0 && (
          <>
            <dl className="space-y-2">
              {resultados.map(r => (
                <div key={r.deduccion.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <dt className="text-sm font-medium">{r.deduccion.descripcion}</dt>
                    <dd className="text-xs text-muted-foreground">{r.deduccion.notas}</dd>
                  </div>
                  <dd className="text-lg font-semibold">{eur(r.importeCents)}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3 flex items-center justify-between">
              <dt className="text-sm font-medium">Total deducciones autonómicas</dt>
              <dd className="text-lg font-bold text-primary">{eur(totalDeduccionesCents)}</dd>
            </div>
          </>
        )}

        {resultados.length === 0 && entrada.hijosMenores3 === 0 && entrada.alquilerMensual === '' && (
          <p className="text-xs text-muted-foreground">
            Introduce tus datos arriba para calcular las deducciones autonómicas aplicables.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
