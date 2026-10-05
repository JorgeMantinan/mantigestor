'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2,
  Receipt,
  Landmark,
  Home,
  Users,
  Sparkles,
  ArrowRight,
  Database,
  FileCheck,
} from 'lucide-react'
import { CASOS_DEMO } from '@/lib/demo/casos'

const ETIQUETAS_PERFIL_FISCAL: Record<string, string> = {
  autonomo: 'Autónomo',
  sociedad: 'Sociedad',
  empleado: 'Empleado',
  alquilador: 'Alquilador',
}

export default function DemoInicio() {
  const [creando, setCreando] = useState(false)
  const [casoClave, setCasoClave] = useState(CASOS_DEMO[0]?.clave ?? 'lucia-diseno')
  const router = useRouter()

  const getSupabase = useCallback(() => createClient(), [])

  const caso = CASOS_DEMO.find(c => c.clave === casoClave) ?? CASOS_DEMO[0]
  if (!caso) return null

  const emitidas = caso.facturas.filter(f => f.tipo === 'ingreso').length
  const gastos = caso.facturas.filter(f => f.tipo === 'gasto').length

  const secciones = [
    {
      icon: Receipt,
      titulo: `${emitidas} facturas emitidas`,
      descripcion: 'Cobros con sus bases imponibles e IVA, listos para el modelo 303.',
      visible: emitidas > 0,
    },
    {
      icon: Landmark,
      titulo: `${gastos} gastos deducibles`,
      descripcion: 'Compras, alquileres, suministros y seguros categorizados.',
      visible: gastos > 0,
    },
    {
      icon: Home,
      titulo: `${caso.propiedades.length} propiedades en alquiler`,
      descripcion: 'Con inquilinos, rentas y fechas de contrato.',
      visible: caso.propiedades.length > 0,
    },
    {
      icon: Users,
      titulo: `${caso.nominas.length} nóminas`,
      descripcion: 'Retenciones de IRPF y seguridad social calculadas automáticamente.',
      visible: caso.nominas.length > 0,
    },
    {
      icon: FileCheck,
      titulo: 'Modelos fiscales generados',
      descripcion: 'Los modelos 303, 111 y 130 de 2026 quedan calculados y guardados.',
      visible: true,
    },
  ].filter(s => s.visible)

  const crearDemo = async () => {
    setCreando(true)
    try {
      const res = await fetch('/api/demo/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caso: casoClave }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? 'No se pudo crear la sesión de demostración')
        return
      }
      const data = await res.json()
      if (!data.email || !data.password) {
        toast.error('La demo no devolvió credenciales válidas, inténtalo de nuevo')
        return
      }
      const { error: authError } = await getSupabase().auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (authError) {
        toast.error(`No se pudo iniciar la sesión de demostración: ${authError.message}`)
        return
      }
      toast.success(`Datos de ${data.usuario ?? caso.nombre} creados, explorando MantiGestor...`)
      router.push('/dashboard')
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
          Elige un perfil de demostración y te creamos una sesión con sus datos
          ({caso.nombre}, {caso.actividad.toLowerCase()}). Sin registro, sin tarjeta. Navega por
          facturas, modelos fiscales, nóminas y alquileres para ver cómo funciona todo.
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

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Elige tu perfil de demostración</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CASOS_DEMO.map(c => (
            <button
              key={c.clave}
              type="button"
              onClick={() => setCasoClave(c.clave)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                c.clave === casoClave
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{c.nombre}</p>
                <Badge variant="outline">{ETIQUETAS_PERFIL_FISCAL[c.perfilFiscal] ?? c.perfilFiscal}</Badge>
              </div>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{c.actividad}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.descripcion}</p>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            Esto es lo que verás con {caso.nombre}
          </CardTitle>
          <CardDescription>{caso.descripcion}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {secciones.map(s => (
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
