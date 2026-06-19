'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Receipt, TrendingUp, TrendingDown, PiggyBank, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  total: number
  iva: number
  fechaEmision: string
  numero: string
  emisorReceptor: string
}

export default function DashboardPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await getSupabase()
        .from('facturas')
        .select('*')
        .eq('perfilId', user.id)
        .order('fechaEmision', { ascending: false })
        .limit(5)

      if (data) setFacturas(data as Factura[])
      setLoading(false)
    }
    fetchData()
  }, [getSupabase])

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const ingresos = facturas.filter((f) => f.tipo === 'ingreso')
  const gastos = facturas.filter((f) => f.tipo === 'gasto')
  const totalIngresos = ingresos.reduce((s, f) => s + f.total, 0)
  const totalGastos = gastos.reduce((s, f) => s + f.total, 0)
  const ivaAingresar = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const ivaSoportado = gastos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const ivaNeto = ivaAingresar - ivaSoportado

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Panel</h1>
        <p className="text-muted-foreground">Resumen de tu actividad fiscal y financiera</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(totalIngresos)}
            </div>
            <p className="text-xs text-muted-foreground">{ingresos.length} facturas emitidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoney(totalGastos)}
            </div>
            <p className="text-xs text-muted-foreground">{gastos.length} facturas recibidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA a ingresar</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${ivaNeto >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatMoney(Math.abs(ivaNeto))}
            </div>
            <p className="text-xs text-muted-foreground">
              {ivaNeto >= 0 ? 'A ingresar (Modelo 303)' : 'A compensar'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(totalIngresos - totalGastos)}
            </div>
            <p className="text-xs text-muted-foreground">Antes de IRPF</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Últimas facturas</CardTitle>
              <Link href="/gestoria/facturas">
                <Button variant="ghost" size="sm">Ver todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : facturas.length === 0 ? (
              <div className="text-center py-6">
                <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Aún no has añadido ninguna factura.
                </p>
                <Link href="/gestoria/facturas/nueva">
                  <Button variant="outline" size="sm" className="mt-3">
                    Añadir primera factura
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {facturas.slice(0, 5).map((f) => (
                  <Link
                    key={f.id}
                    href={`/gestoria/facturas/${f.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${f.tipo === 'ingreso' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                        {f.tipo === 'ingreso' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.emisorReceptor}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.numero} · {new Date(f.fechaEmision).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${f.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {f.tipo === 'ingreso' ? '+' : '-'}{formatMoney(f.total)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Próximos vencimientos fiscales</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Conecta tus facturas para ver los próximos vencimientos del Modelo 303 y 130.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
