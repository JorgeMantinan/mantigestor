'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Receipt, TrendingUp, TrendingDown, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PerfilConsolidado {
  perfilId: string
  nombre: string | null
  email: string
  ingresos: number
  gastos: number
  facturasCount: number
}

export default function MultiEmpresaPage() {
  const { personas } = usePersonaActiva()
  const [datos, setDatos] = useState<PerfilConsolidado[]>([])
  const [cargando, setCargando] = useState(true)
  const anyo = new Date().getFullYear()

  useEffect(() => {
    const cargar = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const perfiles = personas.filter(p => p.tipo === 'gestiono')
      if (perfiles.length === 0) {
        setCargando(false)
        return
      }

      const resultados: PerfilConsolidado[] = []

      for (const p of perfiles) {
        const { data: facturas } = await supabase
          .from('facturas')
          .select('tipo, total')
          .eq('perfilId', p.perfilId)
          .gte('fechaEmision', `${anyo}-01-01`)
          .lte('fechaEmision', `${anyo}-12-31`)

        const ingresos = (facturas ?? []).filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
        const gastos = (facturas ?? []).filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)

        resultados.push({
          perfilId: p.perfilId,
          nombre: p.nombre,
          email: p.email,
          ingresos,
          gastos,
          facturasCount: (facturas ?? []).length,
        })
      }

      setDatos(resultados)
      setCargando(false)
    }
    cargar()
  }, [personas, anyo])

  const totales = useMemo(() => ({
    ingresos: datos.reduce((s, d) => s + d.ingresos, 0),
    gastos: datos.reduce((s, d) => s + d.gastos, 0),
    facturas: datos.reduce((s, d) => s + d.facturasCount, 0),
  }), [datos])

  const formatEur = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Vista consolidada multi-empresa</h1>
          <p className="text-muted-foreground">Resumen de todas las empresas que gestionas ({anyo})</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatEur(totales.ingresos)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatEur(totales.gastos)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Beneficio neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totales.ingresos - totales.gastos >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatEur(totales.ingresos - totales.gastos)}
            </div>
          </CardContent>
        </Card>
      </div>

      {cargando ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-muted rounded" />)}
        </div>
      ) : datos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No tienes personas asociadas para ver una vista consolidada.</p>
            <Link href="/ajustes/personas">
              <Button variant="outline" className="mt-4">Asociar persona</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {datos.map(d => (
            <Card key={d.perfilId}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{d.nombre || 'Sin nombre'}</p>
                    <p className="text-sm text-muted-foreground">{d.email}</p>
                  </div>
                  <div className="text-right grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Ingresos</p>
                      <p className="font-medium text-green-500">{formatEur(d.ingresos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gastos</p>
                      <p className="font-medium text-red-500">{formatEur(d.gastos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Facturas</p>
                      <p className="font-medium">{d.facturasCount}</p>
                    </div>
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
