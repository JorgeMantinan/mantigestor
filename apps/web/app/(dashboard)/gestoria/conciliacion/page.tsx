'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, CheckCircle, AlertCircle, ArrowRight, FileText, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'
import {
  parsearExtractoCSV,
  encontrarCoincidencias,
  BANCOS,
  detectarBanco,
  type BancoId,
  type Coincidencia,
  type LineaFactura,
} from '@/lib/conciliacion-bancaria'

export default function ConciliacionPage() {
  const [coincidencias, setCoincidencias] = useState<Coincidencia[]>([])
  const [facturas, setFacturas] = useState<LineaFactura[]>([])
  const [procesando, setProcesando] = useState(false)
  const [extractoCargado, setExtractoCargado] = useState(false)
  const [reconciliadas, setReconciliadas] = useState<Set<string>>(new Set())
  const [bancoDetectado, setBancoDetectado] = useState<BancoId | null>(null)
  const [bancoManual, setBancoManual] = useState<BancoId>('generico')
  const [textoOriginal, setTextoOriginal] = useState('')
  const getSupabase = useCallback(() => createClient(), [])
  const { t } = useLanguage()

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

  const procesarExtracto = useCallback((texto: string, banco?: BancoId) => {
    const { lineas, bancoDetectado: detectado } = parsearExtractoCSV(texto, banco)
    setBancoDetectado(detectado)
    setExtractoCargado(true)

    const results = encontrarCoincidencias(lineas, facturas)
    setCoincidencias(results)
    setProcesando(false)

    if (results.length > 0) {
      toast.success(`${results.length} ${t('conciliacion.coincidenciasEncontradas')} (${BANCOS[detectado].nombre})`)
    } else {
      toast.info(`${t('conciliacion.sinCoincidenciasToast')} ${BANCOS[detectado].nombre})`)
    }
  }, [facturas, t])

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProcesando(true)
    const texto = await file.text()
    setTextoOriginal(texto)
    procesarExtracto(texto)
  }

  const handleCambioBanco = (nuevoBanco: BancoId) => {
    setBancoManual(nuevoBanco)
    if (textoOriginal) {
      procesarExtracto(textoOriginal, nuevoBanco)
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
      toast.success(t('conciliacion.facturaMarcada'))
    }
  }

  const reconciliarTodas = async () => {
    const pendientes = coincidencias.filter(c => !reconciliadas.has(c.factura.id) && c.puntuacion >= 70)
    for (const c of pendientes) {
      await getSupabase().from('facturas').update({ estado: 'pagada' }).eq('id', c.factura.id)
      setReconciliadas(prev => new Set(prev).add(c.factura.id))
    }
    setFacturas(prev => prev.filter(f => !pendientes.some(c => c.factura.id === f.id)))
    toast.success(`${pendientes.length} ${t('conciliacion.facturasReconciliadas')}`)
  }

  const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const bancosTradicionales = Object.values(BANCOS).filter(b => b.tipo === 'tradicional')
  const bancosFintech = Object.values(BANCOS).filter(b => b.tipo === 'fintech' || b.tipo === 'neobanco')
  const bancosPagos = Object.values(BANCOS).filter(b => b.tipo === 'pagos')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('conciliacion.titulo')}</h1>
        <p className="text-muted-foreground">{t('conciliacion.subtitulo')}</p>
      </div>

      {/* Selector de banco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" /> {t('conciliacion.bancoEntidad')}
          </CardTitle>
          <CardDescription>
            {t('conciliacion.seleccionaBanco')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bancoDetectado && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  {t('conciliacion.detectado')}: {BANCOS[bancoDetectado].nombre}
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">{t('conciliacion.tradicional')}</label>
              <div className="flex flex-wrap gap-2">
                {bancosTradicionales.map(b => (
                  <Button
                    key={b.id}
                    variant={bancoManual === b.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => void handleCambioBanco(b.id)}
                  >
                    {b.nombre}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">{t('conciliacion.neobancosFintech')}</label>
              <div className="flex flex-wrap gap-2">
                {bancosFintech.map(b => (
                  <Button
                    key={b.id}
                    variant={bancoManual === b.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => void handleCambioBanco(b.id)}
                  >
                    {b.nombre}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">{t('conciliacion.pagos')}</label>
              <div className="flex flex-wrap gap-2">
                {bancosPagos.map(b => (
                  <Button
                    key={b.id}
                    variant={bancoManual === b.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => void handleCambioBanco(b.id)}
                  >
                    {b.nombre}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Importar extracto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" /> {t('conciliacion.importarExtracto')}
          </CardTitle>
          <CardDescription>{t('conciliacion.descripcionCsv')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input type="file" accept=".csv,.txt" onChange={(e) => void handleArchivo(e)} className="hidden" id="extracto-input" />
            <Button variant="outline" asChild>
              <label htmlFor="extracto-input" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" /> {t('conciliacion.seleccionarExtracto')}
              </label>
            </Button>
            {procesando && <span className="text-sm text-muted-foreground">{t('conciliacion.procesando')}</span>}
            {extractoCargado && bancoDetectado && (
              <span className="text-sm text-muted-foreground">
                {coincidencias.length} {t('conciliacion.coincidenciasPendientes')} {facturas.length} {t('conciliacion.pendientes')} — {BANCOS[bancoDetectado].nombre}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coincidencias */}
      {coincidencias.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('conciliacion.coincidenciasEncontradas')} ({coincidencias.length})</h2>
            <Button onClick={() => void reconciliarTodas()} size="sm">
              <CheckCircle className="mr-1 h-4 w-4" /> {t('conciliacion.reconciliarAutomaticas')}
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
                          <p className="text-xs text-muted-foreground">{t('conciliacion.extractoBancario')}</p>
                          <p className="text-sm font-medium">{c.extracto.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.extracto.fecha} · {formatEuro(c.extracto.importe)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{t('conciliacion.factura')}</p>
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
                            <ArrowRight className="mr-1 h-3 w-3" /> {t('conciliacion.conciliar')}
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
            <p>{t('conciliacion.sinCoincidencias')}</p>
            <p className="text-xs mt-1">{t('conciliacion.verificaFormato')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
