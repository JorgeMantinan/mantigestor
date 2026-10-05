'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

interface Empresa {
  id: string
  nombre: string
  nif: string
  direccion: string
  activa: boolean
}

interface EmpresaStats {
  empresa: Empresa
  ingresos: number
  gastos: number
  facturasCount: number
}

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
  const [datosPersonas, setDatosPersonas] = useState<PerfilConsolidado[]>([])
  const [datosEmpresas, setDatosEmpresas] = useState<EmpresaStats[]>([])
  const [cargando, setCargando] = useState(true)
  const anyo = new Date().getFullYear()

  useEffect(() => {
    const cargar = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCargando(false); return }

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id, empresas')
        .eq('userId', user.id)
        .single()

      const empresas: Empresa[] = (perfil?.empresas as unknown as Empresa[]) ?? []
      const perfilesGestionados = personas.filter(p => p.tipo === 'gestiono')
      const desde = `${anyo}-01-01`
      const hasta = `${anyo}-12-31`

      if (empresas.length > 0 && perfil) {
        // 1 consulta batch para todas las empresas (antes: una por empresa)
        const { data: facturas } = await supabase
          .from('facturas')
          .select('empresaId, tipo, total')
          .eq('perfilId', perfil.id)
          .in('empresaId', empresas.map(e => e.id))
          .gte('fechaEmision', desde)
          .lte('fechaEmision', hasta)

        const porEmpresa = new Map<string, { ingresos: number; gastos: number; count: number }>()
        for (const f of facturas ?? []) {
          if (!f.empresaId) continue
          let t = porEmpresa.get(f.empresaId)
          if (!t) {
            t = { ingresos: 0, gastos: 0, count: 0 }
            porEmpresa.set(f.empresaId, t)
          }
          t.count++
          if (f.tipo === 'ingreso') t.ingresos += f.total
          if (f.tipo === 'gasto') t.gastos += f.total
        }

        setDatosEmpresas(empresas.map(emp => {
          const t = porEmpresa.get(emp.id)
          return {
            empresa: emp,
            ingresos: t?.ingresos ?? 0,
            gastos: t?.gastos ?? 0,
            facturasCount: t?.count ?? 0,
          }
        }))
      }

      // 1 consulta batch para todas las personas gestionadas (antes: una por persona)
      const { data: facturasPersonas } = perfilesGestionados.length > 0
        ? await supabase
            .from('facturas')
            .select('perfilId, tipo, total')
            .in('perfilId', perfilesGestionados.map(p => p.perfilId))
            .gte('fechaEmision', desde)
            .lte('fechaEmision', hasta)
        : { data: null as Array<{ perfilId: string; tipo: string; total: number }> | null }

      const porPerfil = new Map<string, { ingresos: number; gastos: number; count: number }>()
      for (const f of facturasPersonas ?? []) {
        let t = porPerfil.get(f.perfilId)
        if (!t) {
          t = { ingresos: 0, gastos: 0, count: 0 }
          porPerfil.set(f.perfilId, t)
        }
        t.count++
        if (f.tipo === 'ingreso') t.ingresos += f.total
        if (f.tipo === 'gasto') t.gastos += f.total
      }

      const perfilesConsolidados: PerfilConsolidado[] = perfilesGestionados.map(p => {
        const t = porPerfil.get(p.perfilId)
        return {
          perfilId: p.perfilId,
          nombre: p.nombre,
          email: p.email,
          ingresos: t?.ingresos ?? 0,
          gastos: t?.gastos ?? 0,
          facturasCount: t?.count ?? 0,
        }
      })

      setDatosPersonas(perfilesConsolidados)
      setCargando(false)
    }
    cargar()
  }, [personas, anyo])

  const totales = useMemo(() => ({
    ingresosEmpresas: datosEmpresas.reduce((s, d) => s + d.ingresos, 0),
    gastosEmpresas: datosEmpresas.reduce((s, d) => s + d.gastos, 0),
    facturasEmpresas: datosEmpresas.reduce((s, d) => s + d.facturasCount, 0),
    ingresosPersonas: datosPersonas.reduce((s, d) => s + d.ingresos, 0),
    gastosPersonas: datosPersonas.reduce((s, d) => s + d.gastos, 0),
    facturasPersonas: datosPersonas.reduce((s, d) => s + d.facturasCount, 0),
  }), [datosEmpresas, datosPersonas])

  const formatEur = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const hayDatos = datosEmpresas.length > 0 || datosPersonas.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Vista consolidada multi-empresa</h1>
          <p className="text-muted-foreground">Resumen de todas las empresas y personas que gestionas ({anyo})</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatEur(totales.ingresosEmpresas + totales.ingresosPersonas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatEur(totales.gastosEmpresas + totales.gastosPersonas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Beneficio neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(totales.ingresosEmpresas + totales.ingresosPersonas) - (totales.gastosEmpresas + totales.gastosPersonas) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatEur((totales.ingresosEmpresas + totales.ingresosPersonas) - (totales.gastosEmpresas + totales.gastosPersonas))}
            </div>
          </CardContent>
        </Card>
      </div>

      {cargando ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-muted rounded" />)}
        </div>
      ) : !hayDatos ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No tienes empresas ni personas asociadas para ver una vista consolidada.</p>
            <Link href="/ajustes/personas">
              <Button variant="outline" className="mt-4">Asociar persona</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {datosEmpresas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" aria-hidden="true" />
                Mis empresas
              </h2>
              {datosEmpresas.map(d => (
                <Card key={d.empresa.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{d.empresa.nombre}</p>
                        <p className="text-sm text-muted-foreground">{d.empresa.nif} · {d.empresa.direccion || 'Sin dirección'}</p>
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

          {datosPersonas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" aria-hidden="true" />
                Personas gestionadas
              </h2>
              {datosPersonas.map(d => (
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
      )}
    </div>
  )
}
