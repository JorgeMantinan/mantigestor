'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, CheckCircle, AlertCircle, ArrowRight, FileText, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { parsearExtractoCSV, encontrarCoincidencias, type Coincidencia, type LineaFactura } from '@/lib/conciliacion-bancaria'

export default function ConciliacionPage() {
  const [coincidencias, setCoincidencias] = useState<Coincidencia[]>([])
  const [facturas, setFacturas] = useState<LineaFactura[]>([])
  const [procesando, setProcesando] = useState(false)
  const [extractoCargado, setExtractoCargado] = useState(false)
  const [reconciliadas, setReconciliadas] = useState<Set<string>>(new Set())
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) return
      const { data } = await getSupabase()
        .from('facturas')
        .select('id, fechaEmision, emisorReceptor, nifContraparte, baseImponible, total, estado, tipo')
        .eq('perfilId', user.id)
        .eq('estado', 'pendiente')
        .order('fechaEmision', { ascending: false })
      if (data) setFacturas(data as LineaFactura[])
    }
    cargar()
  }, [getSupabase])

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProcesando(true)

    const texto = await file.text()
    const lineas = parsearExtractoCSV(texto)
    setExtractoCargado(true)

    const results = encontrarCoincidencias(lineas, facturas)
    setCoincidencias(results)
    setProcesando(false)

    if (results.length > 0) {
      toast.success(`${results.length} coincidencias encontradas`)
    } else {
      toast.info('No se encontraron coincidencias automáticas')
    }
  }

  const reconciliar = async (coincidencia: Coincidencia) => {
    const { error } = await getSupabase()
      .from('facturas')
      .update({ estado: 'pagada' })
      .eq('id', coincidencia.factura.id)

    if (!error) {
      setReconciliadas(prev => new Set(prev).add(coincidencia.factura.id))
      setFacturas(prev => prev.filter(f => f.id !== coincidencia.factura.id))
      toast.success('Factura marcada como pagada')
    }
  }

  const reconciliarTodas = async () => {
    const pendientes = coincidencias.filter(c => !reconciliadas.has(c.factura.id) && c.puntuacion >= 70)
    for (const c of pendientes) {
      await getSupabase().from('facturas').update({ estado: 'pagada' }).eq('id', c.factura.id)
      setReconciliadas(prev => new Set(prev).add(c.factura.id))
    }
    setFacturas(prev => prev.filter(f => !pendientes.some(c => c.factura.id === f.id)))
    toast.success(`${pendientes.length} facturas reconciliadas`)
  }

  const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conciliación bancaria</h1>
        <p className="text-muted-foreground">Importa un extracto del banco y casalo con tus facturas pendientes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importar extracto
          </CardTitle>
          <CardDescription>Formato CSV con separador punto y coma: fecha;concepto;importe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input type="file" accept=".csv,.txt" onChange={(e) => void handleArchivo(e)} className="hidden" id="extracto-input" />
            <Button variant="outline" asChild>
              <label htmlFor="extracto-input" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" /> Seleccionar extracto
              </label>
            </Button>
            {procesando && <span className="text-sm text-muted-foreground">Procesando...</span>}
            {extractoCargado && (
              <span className="text-sm text-muted-foreground">
                {coincidencias.length} coincidencias de {facturas.length} facturas pendientes
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {coincidencias.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Coincidencias encontradas ({coincidencias.length})</h2>
            <Button onClick={() => void reconciliarTodas()} size="sm">
              <CheckCircle className="mr-1 h-4 w-4" /> Reconciliar automáticas (≥70%)
            </Button>
          </div>

          <div className="space-y-3">
            {coincidencias.map((c, i) => {
              const yaReconciliada = reconciliadas.has(c.factura.id)
              return (
                <Card key={i} className={yaReconciliada ? 'opacity-50' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Extracto bancario</p>
                          <p className="text-sm font-medium">{c.extracto.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.extracto.fecha} · {formatEuro(c.extracto.importe)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Factura</p>
                          <p className="text-sm font-medium">{c.factura.emisorReceptor}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.factura.fechaEmision.slice(0, 10)} · {formatEuro(c.factura.total)}
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${c.puntuacion >= 70 ? 'text-green-600' : c.puntuacion >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {c.puntuacion}%
                        </div>
                        <p className="text-[10px] text-muted-foreground max-w-[120px]">{c.motivo}</p>
                      </div>
                      <div>
                        {yaReconciliada ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => void reconciliar(c)}>
                            <ArrowRight className="mr-1 h-3 w-3" /> Conciliar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {extractoCargado && coincidencias.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron coincidencias automáticas</p>
            <p className="text-xs mt-1">Verifica el formato del extracto o las facturas pendientes</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
