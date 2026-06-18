'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Plus, Calendar } from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Nomina {
  id: string
  empleada: string
  mes: number
  anyo: number
  salarioBruto: number
  irpf: number
  seguridadSocial: number
  neto: number
}

export default function NominasPage() {
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [showForm, setShowForm] = useState(false)
  const getSupabase = useCallback(() => createClient(), [])

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) return

    const salarioBruto = parseFloat(form.get('salarioBruto') as string) * 100
    const irpf = parseFloat(form.get('irpf') as string)
    const seguridadSocial = parseFloat(form.get('seguridadSocial') as string) * 100
    const descIrpf = Math.round(salarioBruto * (irpf / 100))
    const neto = salarioBruto - descIrpf - seguridadSocial

    await getSupabase().from('nominas').insert({
      perfilId: user.id,
      empleada: form.get('empleada') as string,
      mes: parseInt(form.get('mes') as string, 10),
      anyo: parseInt(form.get('anyo') as string, 10),
      salarioBruto,
      irpf,
      seguridadSocial,
      neto,
    })

    setShowForm(false)
  }

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Nóminas</h1>
          <p className="text-muted-foreground">Gestión de nóminas para empleadas del hogar</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva nómina
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva nómina</CardTitle>
            <CardDescription>Introduce los datos de la nómina mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="empleada">Empleada</Label>
                  <Input id="empleada" name="empleada" required placeholder="Nombre completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mes">Mes</Label>
                  <select
                    id="mes"
                    name="mes"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {MESES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="salarioBruto">Salario bruto (€)</Label>
                  <Input id="salarioBruto" name="salarioBruto" type="number" step="0.01" required placeholder="1200.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="irpf">IRPF (%)</Label>
                  <Input id="irpf" name="irpf" type="number" step="0.1" required placeholder="2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seguridadSocial">Seg. Social (€)</Label>
                  <Input id="seguridadSocial" name="seguridadSocial" type="number" step="0.01" required placeholder="50.00" />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <Button type="submit" className="flex-1">Guardar nómina</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {nominas.length === 0 && !showForm && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay nóminas</p>
              <p className="text-sm text-muted-foreground">
                Añade nóminas para empleadas del hogar y lleva el control mensual
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {nominas.length > 0 && (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Empleada</th>
                  <th className="px-4 py-3 text-left font-medium">Mes</th>
                  <th className="px-4 py-3 text-right font-medium">Bruto</th>
                  <th className="px-4 py-3 text-right font-medium">IRPF</th>
                  <th className="px-4 py-3 text-right font-medium">S.Social</th>
                  <th className="px-4 py-3 text-right font-medium">Neto</th>
                </tr>
              </thead>
              <tbody>
                {nominas.map((n) => (
                  <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">{n.empleada}</td>
                    <td className="px-4 py-3">{MESES[n.mes - 1]} {n.anyo}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(n.salarioBruto)}</td>
                    <td className="px-4 py-3 text-right">{n.irpf}%</td>
                    <td className="px-4 py-3 text-right">{formatMoney(n.seguridadSocial)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(n.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
