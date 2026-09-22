'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Search, Users, ArrowUpRight, TrendingUp, TrendingDown, Clock, AlertCircle, BarChart3, AlertTriangle as AlertTriangleIcon, FileText as FileTextIcon } from 'lucide-react'
import { formatoMoneda } from '@/lib/divisas'

interface ClienteResumen {
  perfilId: string
  nombre: string | null
  email: string
  totalIngresos: number
  totalGastos: number
  facturasPendientes: number
  facturasVencidas: number
}

export default function AsesorPage() {
  const { personas } = usePersonaActiva()
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const getSupabase = useCallback(() => createClient(), [])

  const clientesGestionados = personas.filter(p => p.tipo === 'gestiono')

  useEffect(() => {
    async function cargarResumenes() {
      setLoading(true)
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setLoading(false); return }

      const resumenes: ClienteResumen[] = []

      for (const persona of clientesGestionados) {
        try {
          const { data: facturas } = await getSupabase()
            .from('facturas')
            .select('tipo, baseImponible, iva, total, estado')
            .eq('perfilId', persona.perfilId)

          if (facturas) {
            const ingresos = facturas.filter(f => f.tipo === 'ingreso')
            const gastos = facturas.filter(f => f.tipo === 'gasto')
            resumenes.push({
              perfilId: persona.perfilId,
              nombre: persona.nombre,
              email: persona.email,
              totalIngresos: ingresos.reduce((s, f) => s + f.total, 0),
              totalGastos: gastos.reduce((s, f) => s + f.total, 0),
              facturasPendientes: facturas.filter(f => f.estado === 'pendiente').length,
              facturasVencidas: facturas.filter(f => f.estado === 'vencida').length,
            })
          } else {
            resumenes.push({
              perfilId: persona.perfilId,
              nombre: persona.nombre,
              email: persona.email,
              totalIngresos: 0,
              totalGastos: 0,
              facturasPendientes: 0,
              facturasVencidas: 0,
            })
          }
        } catch {
          resumenes.push({
            perfilId: persona.perfilId,
            nombre: persona.nombre,
            email: persona.email,
            totalIngresos: 0,
            totalGastos: 0,
            facturasPendientes: 0,
            facturasVencidas: 0,
          })
        }
      }

      setClientes(resumenes)
      setLoading(false)
    }

    cargarResumenes()
  }, [clientesGestionados.length])

  const filtrados = clientes.filter(c =>
    (c.nombre?.toLowerCase().includes(busqueda.toLowerCase())) ||
    c.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalIngresos = clientes.reduce((s, c) => s + c.totalIngresos, 0)
  const totalGastos = clientes.reduce((s, c) => s + c.totalGastos, 0)
  const totalPendientes = clientes.reduce((s, c) => s + c.facturasPendientes, 0)
  const totalVencidas = clientes.reduce((s, c) => s + c.facturasVencidas, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Vista Consolidada — Asesor</h1>
          <p className="text-muted-foreground">Resumen de todos los clientes que gestionas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/asesor/dashboard-consolidado">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-1" aria-hidden="true" />
              Dashboard consolidado
            </Button>
          </Link>
          <Link href="/asesor/alertas">
            <Button variant="outline" size="sm">
              <AlertTriangleIcon className="h-4 w-4 mr-1" aria-hidden="true" />
              Alertas
            </Button>
          </Link>
          <Link href="/asesor/informes">
            <Button variant="outline" size="sm">
              <FileTextIcon className="h-4 w-4 mr-1" aria-hidden="true" />
              Informes
            </Button>
          </Link>
        </div>
      </div>

      {clientesGestionados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No gestionas ningún cliente</p>
              <p className="text-sm text-muted-foreground">
                Asocia personas desde Ajustes &gt; Personas para verlas aquí.
              </p>
            </div>
            <Link href="/ajustes/personas">
              <Button>Gestionar personas</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs globales */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Ingresos totales
                </div>
                <p className="mt-1 text-2xl font-bold text-green-600">{formatoMoneda(totalIngresos / 100, 'EUR')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Gastos totales
                </div>
                <p className="mt-1 text-2xl font-bold text-red-600">{formatoMoneda(totalGastos / 100, 'EUR')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Pendientes
                </div>
                <p className="mt-1 text-2xl font-bold text-yellow-600">{totalPendientes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Vencidas
                </div>
                <p className="mt-1 text-2xl font-bold text-red-600">{totalVencidas}</p>
              </CardContent>
            </Card>
          </div>

          {/* Búsqueda */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <p className="text-muted-foreground">Cargando resúmenes...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtrados.map(cliente => (
                <Card key={cliente.perfilId} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {cliente.nombre || cliente.email}
                      </CardTitle>
                      <Link href={`/dashboard?perfilActivo=${cliente.perfilId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ver dashboard de ${cliente.nombre || cliente.email}`}>
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingresos</span>
                      <span className="font-medium text-green-600">{formatoMoneda(cliente.totalIngresos / 100, 'EUR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gastos</span>
                      <span className="font-medium text-red-600">{formatoMoneda(cliente.totalGastos / 100, 'EUR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo</span>
                      <span className="font-medium">{formatoMoneda((cliente.totalIngresos - cliente.totalGastos) / 100, 'EUR')}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-xs">
                      <span className="text-muted-foreground">Pendientes: {cliente.facturasPendientes}</span>
                      {cliente.facturasVencidas > 0 && (
                        <span className="text-red-600 font-medium">Vencidas: {cliente.facturasVencidas}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
