'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Users, Calculator } from 'lucide-react'
import { dividirGasto, dividirIgual } from '@mantigestor/utils'

interface Participante {
  nombre: string
  porcentaje: number
}

export default function DividirGastoPage() {
  const [total, setTotal] = useState('')
  const [participantes, setParticipantes] = useState<Participante[]>([
    { nombre: 'Persona 1', porcentaje: 50 },
    { nombre: 'Persona 2', porcentaje: 50 },
  ])
  const [resultado, setResultado] = useState<ReturnType<typeof dividirGasto> | null>(null)

  const totalNum = parseFloat(total) || 0

  const agregarParticipante = () => {
    const n = participantes.length + 1
    const nuevoPorcentaje = Math.round(100 / n)
    setParticipantes(prev => [
      ...prev.map(p => ({ ...p, porcentaje: Math.round(100 / n) })),
      { nombre: `Persona ${n}`, porcentaje: 100 - nuevoPorcentaje * (n - 1) }
    ])
  }

  const eliminarParticipante = (idx: number) => {
    if (participantes.length <= 2) return
    setParticipantes(prev => prev.filter((_, i) => i !== idx))
  }

  const actualizarNombre = (idx: number, nombre: string) => {
    setParticipantes(prev => prev.map((p, i) => i === idx ? { ...p, nombre } : p))
  }

  const actualizarPorcentaje = (idx: number, porcentaje: number) => {
    setParticipantes(prev => prev.map((p, i) => i === idx ? { ...p, porcentaje } : p))
  }

  const calcular = () => {
    setResultado(dividirGasto(totalNum, participantes))
  }

  const calcularIgual = () => {
    const nombres = participantes.map(p => p.nombre)
    setResultado(dividirIgual(totalNum, nombres))
    setParticipantes(prev => prev.map(p => ({ ...p, porcentaje: Math.round(100 / prev.length) })))
  }

  const totalPorcentaje = participantes.reduce((s, p) => s + p.porcentaje, 0)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Dividir gasto</h1>
        <p className="text-muted-foreground">Divide un gasto entre varias personas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos del gasto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="total">Importe total (€)</Label>
            <Input
              id="total"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={total}
              onChange={e => setTotal(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden="true" />
              Participantes
            </CardTitle>
            <CardDescription>
              {participantes.length} personas · {totalPorcentaje}% total
              {totalPorcentaje !== 100 && (
                <span className="text-destructive ml-1">(debe sumar 100%)</span>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={agregarParticipante}>
            <Plus className="mr-1 h-3 w-3" /> Añadir
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {participantes.map((p, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Input
                placeholder="Nombre"
                value={p.nombre}
                onChange={e => actualizarNombre(idx, e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-1 w-24">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={p.porcentaje}
                  onChange={e => actualizarPorcentaje(idx, parseInt(e.target.value) || 0)}
                  className="w-16 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => eliminarParticipante(idx)}
                disabled={participantes.length <= 2}
                aria-label={`Eliminar ${p.nombre}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={calcular} disabled={totalNum <= 0 || totalPorcentaje !== 100} className="flex-1">
          <Calculator className="mr-2 h-4 w-4" /> Calcular por porcentaje
        </Button>
        <Button variant="outline" onClick={calcularIgual} disabled={totalNum <= 0} className="flex-1">
          <Users className="mr-2 h-4 w-4" /> Dividir igual
        </Button>
      </div>

      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resultado.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <span className="font-medium">{r.nombre}</span>
                    <span className="text-sm text-muted-foreground ml-2">({r.porcentaje}%)</span>
                  </div>
                  <span className="font-bold text-lg">{r.importe.toFixed(2)} €</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50 font-bold">
                <span>Total</span>
                <span>{resultado.reduce((s, r) => s + r.importe, 0).toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
