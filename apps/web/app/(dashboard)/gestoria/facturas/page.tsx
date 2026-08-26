'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Receipt, ArrowUpRight, Trash2, Repeat } from 'lucide-react'
import { BotonPDF } from '@/components/boton-pdf'

interface Factura {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
}

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'ingreso' | 'gasto'>('todas')

  const getSupabase = useCallback(() => createClient(), [])

  const fetchFacturas = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { data, error } = await getSupabase()
      .from('facturas')
      .select('*')
      .eq('perfilId', user.id)
      .order('createdAt', { ascending: false })

    if (!error && data) setFacturas(data as Factura[])
    setLoading(false)
  }, [getSupabase])

  useEffect(() => { fetchFacturas() }, [fetchFacturas])

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta factura?')) return
    await getSupabase().from('facturas').delete().eq('id', id)
    setFacturas((prev) => prev.filter((f) => f.id !== id))
  }

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground">Gestiona tus facturas emitidas y recibidas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/gestoria/facturas/recurrentes">
            <Button variant="outline" size="sm">
              <Repeat className="mr-1 h-3 w-3" />
              Recurrentes
            </Button>
          </Link>
          <BotonPDF elementId="tabla-facturas" filename={`facturas-${new Date().toISOString().slice(0, 10)}`} />
          <Link href="/gestoria/facturas/nueva">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva factura
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={filtro === 'todas' ? 'secondary' : 'outline'} size="sm" onClick={() => setFiltro('todas')}>
          Todas
        </Button>
        <Button variant={filtro === 'ingreso' ? 'secondary' : 'outline'} size="sm" onClick={() => setFiltro('ingreso')}>
          Ingresos
        </Button>
        <Button variant={filtro === 'gasto' ? 'secondary' : 'outline'} size="sm" onClick={() => setFiltro('gasto')}>
          Gastos
        </Button>
      </div>

      {(() => {
        const visibles = filtro === 'todas' ? facturas : facturas.filter((f) => f.tipo === filtro)

      return loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Cargando facturas...
          </CardContent>
        </Card>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Receipt className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay {filtro !== 'todas' ? `facturas de tipo "${filtro}"` : 'facturas'}</p>
              <p className="text-sm text-muted-foreground">
                {filtro !== 'todas' ? 'Cambia el filtro o crea una nueva factura' : 'Crea tu primera factura para empezar'}
              </p>
            </div>
            <Link href="/gestoria/facturas/nueva">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear factura
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div id="tabla-facturas" className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Nº</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Contraparte</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium">Base</th>
                  <th className="px-4 py-3 text-right font-medium">IVA</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-center font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{f.numero}</td>
                    <td className="px-4 py-3 capitalize">{f.tipo === 'ingreso' ? 'Emitida' : 'Recibida'}</td>
                    <td className="px-4 py-3">{f.emisorReceptor}</td>
                    <td className="px-4 py-3">
                      {new Date(f.fechaEmision).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(f.baseImponible)}</td>
                    <td className="px-4 py-3 text-right">{f.iva}%</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(f.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/gestoria/facturas/${f.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => eliminar(f.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )})()}
    </div>
  )
}
