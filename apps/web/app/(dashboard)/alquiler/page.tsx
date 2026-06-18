'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, Plus, Building2, Euro } from 'lucide-react'

interface Propiedad {
  id: string
  direccion: string
  ingresos: number
  gastos: number
}

export default function AlquilerPage() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [showForm, setShowForm] = useState(false)
  const getSupabase = useCallback(() => createClient(), [])

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) return

    const { data, error } = await getSupabase().from('propiedades_alquiler').insert({
      perfilId: user.id,
      direccion: form.get('direccion') as string,
    }).select().single()

    if (!error && data) {
      setPropiedades([{ id: data.id, direccion: data.direccion, ingresos: 0, gastos: 0 }, ...propiedades])
      setShowForm(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Alquiler</h1>
          <p className="text-muted-foreground">Gestión de propiedades en alquiler</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Añadir propiedad
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva propiedad</CardTitle>
            <CardDescription>Introduce la dirección del inmueble</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" name="direccion" required placeholder="Calle Mayor 1, Madrid" />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit">Guardar</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {propiedades.length === 0 && !showForm && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Home className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay propiedades</p>
              <p className="text-sm text-muted-foreground">
                Añade tus propiedades en alquiler para controlar ingresos y gastos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {propiedades.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {propiedades.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-base">{p.direccion}</CardTitle>
                    <CardDescription>Propiedad en alquiler</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ingresos</span>
                    <p className="font-medium text-green-600">{(p.ingresos / 100).toFixed(2)} €</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gastos</span>
                    <p className="font-medium text-red-600">{(p.gastos / 100).toFixed(2)} €</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Balance</span>
                    <p className="font-medium">{((p.ingresos - p.gastos) / 100).toFixed(2)} €</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
