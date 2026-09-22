'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle, AlertCircle, ArrowRight, FileText, Building2, Save, Database, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import {
  parsearCSV,
  encontrarCoincidencias,
  detectarBanco,
  BANCOS_DISPONIBLES,
  type BancoFormato,
  type MovimientoBancoCSV,
} from '@/lib/bank-parser'

interface MovimientoGuardado {
  id: string
  fecha: string
  concepto: string
  importe: number
  saldo: number
  referencia: string | null
  categoria: string | null
  conciliado: boolean
  facturaId: string | null
}

interface Coincidencia {
  movimiento: MovimientoBancoCSV
  factura: { id: string; numero: string; emisorReceptor: string; fechaEmision: string; total: number; estado: string }
  puntuacion: number
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

export default function ImportarBancoPage() {
  const { t } = useLanguage()
  const { perfilActivoId } = usePersonaActiva()
  const [movimientos, setMovimientos] = useState<MovimientoBancoCSV[]>([])
  const [coincidencias, setCoincidencias] = useState<Coincidencia[]>([])
  const [facturas, setFacturas] = useState<{ id: string; numero: string; emisorReceptor: string; fechaEmision: string; total: number; estado: string }[]>([])
  const [cargado, setCargado] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [bancoDetectado, setBancoDetectado] = useState<BancoFormato>('generico')
  const [bancoManual, setBancoManual] = useState<BancoFormato>('generico')
  const [textoOriginal, setTextoOriginal] = useState('')
  const [movimientosGuardados, setMovimientosGuardados] = useState<MovimientoGuardado[]>([])
  const [reconciliadas, setReconciliadas] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!perfilActivoId) return
    const cargar = async () => {
      const { data } = await createClient()
        .from('facturas')
        .select('id, numero, emisorReceptor, fechaEmision, total, estado')
        .eq('perfilId', perfilActivoId)
        .eq('estado', 'pendiente')
        .order('fechaEmision', { ascending: false })
      if (data) setFacturas(data)
    }
    cargar()
  }, [perfilActivoId])

  useEffect(() => {
    if (!perfilActivoId) return
    const cargar = async () => {
      const { data } = await createClient()
        .from('movimientos_banco')
        .select('*')
        .eq('perfilId', perfilActivoId)
        .order('fecha', { ascending: false })
        .limit(100)
      if (data) setMovimientosGuardados(data as MovimientoGuardado[])
    }
    cargar()
  }, [perfilActivoId])

  const procesarTexto = useCallback((texto: string, banco?: BancoFormato) => {
    const parsed = parsearCSV(texto, banco)
    setMovimientos(parsed)
    setCargado(true)
    setTextoOriginal(texto)

    const detectado = banco ?? detectarBanco(texto)
    setBancoDetectado(detectado)
    setBancoManual(detectado)

    const results = encontrarCoincidencias(parsed, facturas)
    setCoincidencias(results)

    if (results.length > 0) {
      toast.success(`${results.length} coincidencias encontradas (${BANCOS_DISPONIBLES.find(b => b.id === detectado)?.nombre})`)
    } else {
      toast.info(`No se encontraron coincidencias automáticamente`)
    }
  }, [facturas])

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProcesando(true)
    const texto = await file.text()
    procesarTexto(texto)
    setProcesando(false)
  }

  const handleCambioBanco = (nuevoBanco: BancoFormato) => {
    setBancoManual(nuevoBanco)
    if (textoOriginal) {
      procesarTexto(textoOriginal, nuevoBanco)
    }
  }

  const guardarMovimientos = async () => {
    if (!perfilActivoId || movimientos.length === 0) return
    setGuardando(true)
    try {
      const res = await fetch('/api/fiscal/conciliacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movimientos: movimientos.map(m => ({
            fecha: m.fecha,
            concepto: m.concepto,
            importe: m.importe,
            saldo: m.saldo ?? 0,
            referencia: m.referencia,
            categoria: m.importe >= 0 ? 'ingreso' : 'gasto',
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Error guardando movimientos')
        return
      }
      const { data } = await res.json()
      toast.success(`${movimientos.length} movimientos guardados`)
      if (data) {
        setMovimientosGuardados(prev => [...data as MovimientoGuardado[], ...prev])
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  const movimientosSinConciliar = movimientos.filter(m =>
    !movimientosGuardados.some(g => g.concepto === m.concepto && Math.abs(g.importe - m.importe) < 0.01)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar extracto bancario</h1>
        <p className="text-muted-foreground">Sube el CSV de tu banco para conciliar movimientos con facturas</p>
      </div>

      {/* Selector de banco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Banco / Entidad
          </CardTitle>
          <CardDescription>Selecciona tu banco o déjalo en automático</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BANCOS_DISPONIBLES.map(b => (
              <Button
                key={b.id}
                variant={bancoManual === b.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCambioBanco(b.id)}
              >
                {b.nombre}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subir archivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" /> Subir extracto CSV
          </CardTitle>
          <CardDescription>Formatos soportados: Sabadell, CaixaBank, Santander, BBVA, genérico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => void handleArchivo(e)}
              className="hidden"
              id="banco-input"
            />
            <Button variant="outline" asChild>
              <label htmlFor="banco-input" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" /> Seleccionar archivo
              </label>
            </Button>
            {procesando && <span className="text-sm text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Procesando...</span>}
            {cargado && (
              <Button onClick={() => void guardarMovimientos()} disabled={guardando} size="sm">
                <Save className="mr-1 h-4 w-4" />
                {guardando ? 'Guardando...' : 'Guardar movimientos'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      {cargado && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Movimientos importados</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{movimientos.length}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Coincidencias</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">{coincidencias.length}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sin conciliar</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-orange-600">{movimientosSinConciliar.length}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Coincidencias */}
      {coincidencias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Coincidencias encontradas ({coincidencias.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coincidencias.slice(0, 20).map((c, i) => {
                const yaGuardada = movimientosGuardados.some(
                  g => g.concepto === c.movimiento.concepto && Math.abs(g.importe - c.movimiento.importe) < 0.01
                )
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {yaGuardada ? (
                        <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/30" aria-hidden="true" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{c.movimiento.concepto}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.movimiento.fecha} — {c.factura.emisorReceptor} ({c.factura.numero})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-bold ${c.puntuacion >= 70 ? 'text-green-600' : c.puntuacion >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {c.puntuacion}%
                      </div>
                      <span className="text-sm font-medium">{formatEuro(c.movimiento.importe)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movimientos recientes */}
      {movimientosGuardados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" /> Movimientos guardados ({movimientosGuardados.length})
            </CardTitle>
            <CardDescription>Últimos movimientos persistidos en la base de datos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {movimientosGuardados.slice(0, 50).map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="flex items-center gap-3">
                    {m.conciliado ? (
                      <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/30" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.concepto}</p>
                      <p className="text-xs text-muted-foreground">{m.fecha?.slice(0, 10)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${m.importe >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {m.importe >= 0 ? '+' : ''}{formatEuro(m.importe)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
