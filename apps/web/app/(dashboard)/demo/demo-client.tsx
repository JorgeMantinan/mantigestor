'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Receipt, Landmark, Home, Users, Sparkles, ArrowRight, Database } from 'lucide-react'
import { guardarPerfilDemo } from '@/lib/demo-data'

const SECCIONES = [
  {
    icon: Receipt,
    titulo: '10 facturas emitidas',
    descripcion: 'Pendientes y cobradas con IVA del 21% y 10%, listas para ver el modelo 303.',
  },
  {
    icon: Landmark,
    titulo: '5 gastos deducibles',
    descripcion: 'Alquiler de local, material, formación, telefonía y seguros categorizados.',
  },
  {
    icon: Home,
    titulo: '2 propiedades en alquiler',
    descripcion: 'Con inquilinos, ingresos mensuales y fechas de contrato.',
  },
  {
    icon: Users,
    titulo: '3 nóminas',
    descripcion: 'Empleadas con cálculo automático de retenciones IRPF y seguridad social.',
  },
]

export default function DemoInicio() {
  const [creando, setCreando] = useState(false)
  const router = useRouter()

  const crearDemo = async () => {
    setCreando(true)
    try {
      const res = await fetch('/api/demo/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? 'No se pudo crear la sesión de demostración')
        return
      }
      const data = await res.json()
      if (data.perfilId) {
        guardarPerfilDemo(data.perfilId)
        toast.success('Datos de ejemplo creados, explorando MantiGestor...')
        router.push('/dashboard')
      }
    } catch {
      toast.error('Error de conexión al crear la demo')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">
          Explora MantiGestor con datos de ejemplo
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Te creamos una sesión con los datos de <strong>Lucía Fernández</strong>, una autónoma de
          diseño gráfico. Sin registro, sin tarjeta. Navega por facturas, modelos fiscales, nóminas y
          alquileres para ver cómo funciona todo.
        </p>
        <Button size="lg" className="text-base px-8" onClick={() => void crearDemo()} disabled={creando}>
          {creando ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              Creando datos de ejemplo...
            </>
          ) : (
            <>
              <Database className="mr-2 h-5 w-5" aria-hidden="true" />
              Explorar con datos de ejemplo
            </>
          )}
        </Button>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          Serás dirigido al panel principal al terminar
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            Esto es lo que verás
          </CardTitle>
          <CardDescription>
            Datos ficticios de una autónoma trabajando en España.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {SECCIONES.map(s => (
            <div key={s.titulo} className="flex gap-3 rounded-lg border p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">{s.titulo}</p>
                <p className="text-xs text-muted-foreground">{s.descripcion}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Badge variant="outline" className="shrink-0">Demo</Badge>
        Todos los datos son ficticios y nunca se mezclan con datos reales de tu cuenta.
      </div>
    </div>
  )
}