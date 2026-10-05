'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { descargarExcel } from '@/lib/descargar-excel'
import { generarReporteGastosPDF } from '@/lib/reporte-gastos-pdf'
import { useLanguage } from '@/contexts/language-context'
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
  const [, setCargando] = useState(true)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [resultados, setResultados] = useState<Factura[]>([])
  const getSupabase = useCallback(() => createClient(), [])
  const { t } = useLanguage()

  useEffect(() => {
    const cargar = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCargando(false); return }
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('userId', user.id)
        .single()
      if (!perfil) { setCargando(false); return }
      const { data } = await supabase
        .from('facturas')
        .select('*')
        .eq('perfilId', perfil.id)
        .order('fechaEmision', { ascending: false })
        .limit(500)
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

  const exportarPDF = async () => {
    const periodo = `${fechaDesde || 'Inicio'} al ${fechaHasta || 'Fin'}`
    await generarReporteGastosPDF({
      titulo: t('informes.titulo'),
      periodo,
      lineas: resultados.map(f => ({
        fecha: f.fechaEmision,
        numero: f.numero,
        contraparte: f.emisorReceptor,
        baseImponible: f.baseImponible,
        iva: Math.round(f.baseImponible * f.iva / 100),
        total: f.total,
        categoria: f.categoriaGasto ?? 'otros',
      })),
      totalBase: resultados.reduce((s, f) => s + f.baseImponible, 0),
      totalIva: totalIvaSoportado,
      total: totalGastos,
    })
  }

  const totalIngresos = resultados.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
  const totalGastos = resultados.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)
  const totalIvaRepercutido = resultados.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)
  const totalIvaSoportado = resultados.filter(f => f.tipo === 'gasto').reduce((s, f) => s + Math.round(f.baseImponible * f.iva / 100), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('informes.titulo')}</h1>
        <p className="text-muted-foreground">{t('informes.subtitulo')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> {t('common.filtrar')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('informes.fechaDesde')}</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('informes.fechaHasta')}</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('informes.tipo')}</Label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={SELECT_CLS}>
                <option value="todos">{t('informes.todos')}</option>
                <option value="ingreso">{t('informes.ingresos')}</option>
                <option value="gasto">{t('informes.gastos')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('informes.estado')}</Label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className={SELECT_CLS}>
                <option value="todos">{t('informes.todos')}</option>
                <option value="pendiente">{t('informes.pendiente')}</option>
                <option value="pagada">{t('informes.pagada')}</option>
                <option value="vencida">{t('informes.vencida')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={generarInforme}>{t('informes.generarInforme')}</Button>
            {resultados.length > 0 && (
              <>
                <Button variant="outline" onClick={() => void exportarPDF()}>
                  <FileText className="mr-2 h-4 w-4" /> {t('informes.exportarPdf')}
                </Button>
                <Button variant="outline" onClick={exportarExcel}>
                  <Download className="mr-2 h-4 w-4" /> {t('informes.exportarExcel')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{t('informes.ingresos')}</p>
                <p className="text-lg font-bold text-green-600">{formatEuro(totalIngresos)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{t('informes.gastos')}</p>
                <p className="text-lg font-bold text-red-600">{formatEuro(totalGastos)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{t('informes.ivaRepercutido')}</p>
                <p className="text-lg font-bold">{formatEuro(totalIvaRepercutido)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{t('informes.ivaSoportado')}</p>
                <p className="text-lg font-bold">{formatEuro(totalIvaSoportado)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('informes.resultados')} ({resultados.length} {t('informes.facturas')})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left">{t('informes.fecha')}</th>
                      <th className="px-3 py-2 text-left">{t('informes.numero')}</th>
                      <th className="px-3 py-2 text-left">{t('informes.tipo')}</th>
                      <th className="px-3 py-2 text-left">{t('informes.contraparte')}</th>
                      <th className="px-3 py-2 text-right">{t('informes.base')}</th>
                      <th className="px-3 py-2 text-right">{t('informes.ivaLabel')}</th>
                      <th className="px-3 py-2 text-right">{t('informes.total')}</th>
                      <th className="px-3 py-2 text-left">{t('informes.estadoLabel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map(f => (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2">{f.fechaEmision.slice(0, 10)}</td>
                        <td className="px-3 py-2 font-mono">{f.numero}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${f.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {f.tipo === 'ingreso' ? t('informes.ingresos') : t('informes.gastos')}
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
