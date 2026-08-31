'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { descargarExcel } from '@/lib/descargar-excel'
import { FileText, Download, Filter } from 'lucide-react'
import { SELECT_CLS } from '@/lib/ui-constants'

interface Factura {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
  categoriaGasto: string | null
}

const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export default function InformesPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [cargando, setCargando] = useState(true)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [resultados, setResultados] = useState<Factura[]>([])
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }
      const { data } = await getSupabase()
        .from('facturas')
        .select('*')
        .eq('perfilId', user.id)
        .order('fechaEmision', { ascending: false })
      if (data) setFacturas(data as Factura[])
      setCargando(false)
    }
    cargar()
  }, [getSupabase])

  const generarInforme = () => {
    let filtradas = [...facturas]
    if (fechaDesde) filtradas = filtradas.filter(f => f.fechaEmision >= fechaDesde)
    if (fechaHasta) filtradas = filtradas.filter(f => f.fechaEmision <= fechaHasta + 'T23:59:59')
    if (tipo !== 'todos') filtradas = filtradas.filter(f => f.tipo === tipo)
    if (estado !== 'todos') filtradas = filtradas.filter(f => f.estado === estado)
    setResultados(filtradas)
  }

  const exportarExcel = () => {
    const headers = ['Fecha', 'Nº', 'Tipo', 'Contraparte', 'NIF', 'Base', 'IVA', 'Total', 'Estado', 'Categoría']
    const rows = resultados.map(f => [
      f.fechaEmision.slice(0, 10),
      f.numero,
      f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
      f.emisorReceptor,
      f.nifContraparte ?? '',
      f.baseImponible.toFixed(2),
      f.iva.toString(),
      f.total.toFixed(2),
      f.estado,
      f.categoriaGasto ?? '',
    ])
    descargarExcel(headers, rows, `informe-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Informe')
  }

  const totalIngresos = resultados.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
  const totalGastos = resultados.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)
  const totalIvaRepercutido = resultados.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
  const totalIvaSoportado = resultados.filter(f => f.tipo === 'gasto').reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Informes</h1>
        <p className="text-muted-foreground">Genera informes personalizados de tus facturas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Fecha desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={SELECT_CLS}>
                <option value="todos">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="gasto">Gastos</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className={SELECT_CLS}>
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="vencida">Vencida</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={generarInforme}>Generar informe</Button>
            {resultados.length > 0 && (
              <Button variant="outline" onClick={exportarExcel}>
                <Download className="mr-2 h-4 w-4" /> Exportar Excel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="text-lg font-bold text-green-600">{formatEuro(totalIngresos)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Gastos</p>
                <p className="text-lg font-bold text-red-600">{formatEuro(totalGastos)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">IVA repercutido</p>
                <p className="text-lg font-bold">{formatEuro(totalIvaRepercutido)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">IVA soportado</p>
                <p className="text-lg font-bold">{formatEuro(totalIvaSoportado)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resultados ({resultados.length} facturas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Nº</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Contraparte</th>
                      <th className="px-3 py-2 text-right">Base</th>
                      <th className="px-3 py-2 text-right">IVA</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map(f => (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2">{f.fechaEmision.slice(0, 10)}</td>
                        <td className="px-3 py-2 font-mono">{f.numero}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${f.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                          </span>
                        </td>
                        <td className="px-3 py-2">{f.emisorReceptor}</td>
                        <td className="px-3 py-2 text-right">{formatEuro(f.baseImponible)}</td>
                        <td className="px-3 py-2 text-right">{f.iva}%</td>
                        <td className="px-3 py-2 text-right font-medium">{formatEuro(f.total)}</td>
                        <td className="px-3 py-2">{f.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
