'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, FileText, Plus, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { validarFactura, type ResultadoValidacion } from '@/lib/validar-documento'
import { ValidacionOcr } from '@/components/validacion-ocr'

interface OcrData {
  numero: string | null
  emisorReceptor: string | null
  nifContraparte: string | null
  fechaEmision: string | null
  baseImponible: number | null
  iva: number | null
  total: number | null
  tipo: 'ingreso' | 'gasto' | null
  categoriaGasto: string | null
  modelosSugeridos: Array<{ modelo: string; razon: string }>
}

export interface ResultadoOcrLote {
  nombre: string
  resultado: OcrData | null
  error?: string
}

interface OcrBatchResultsProps {
  resultados: ResultadoOcrLote[]
}

export function OcrBatchResults({ resultados }: OcrBatchResultsProps) {
  const router = useRouter()
  const [expandido, setExpandido] = useState<number | null>(null)
  const { t } = useLanguage()

  const exitosos = resultados.filter(r => r.resultado !== null)
  const errores = resultados.filter(r => r.error)

  const irACrearFactura = (r: ResultadoOcrLote) => {
    if (!r.resultado) return
    const params = new URLSearchParams()
    if (r.resultado.numero) params.set('numero', r.resultado.numero)
    if (r.resultado.emisorReceptor) params.set('emisorReceptor', r.resultado.emisorReceptor)
    if (r.resultado.nifContraparte) params.set('nifContraparte', r.resultado.nifContraparte)
    if (r.resultado.fechaEmision) params.set('fechaEmision', r.resultado.fechaEmision)
    if (r.resultado.baseImponible != null) params.set('baseImponible', String(r.resultado.baseImponible))
    if (r.resultado.iva != null) params.set('iva', String(r.resultado.iva))
    if (r.resultado.total != null) params.set('total', String(r.resultado.total))
    if (r.resultado.tipo) params.set('tipo', r.resultado.tipo)
    if (r.resultado.categoriaGasto) params.set('categoriaGasto', r.resultado.categoriaGasto)
    router.push(`/gestoria/facturas/nueva?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          {resultados.length} {t('ocrBatch.procesados')}
        </span>
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          {exitosos.length} {t('ocrBatch.exitosos')}
        </span>
        {errores.length > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
            {errores.length} {t('ocrBatch.errores')}
          </span>
        )}
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">{t('ocrBatch.archivo')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('ocrBatch.numeroFactura')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('ocrBatch.emisorReceptor')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('ocrBatch.fecha')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('ocrBatch.total')}</th>
              <th className="px-3 py-2 text-center font-medium">{t('ocrBatch.estado')}</th>
              <th className="px-3 py-2 text-center font-medium">{t('ocrBatch.accion')}</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r, i) => {
              const validacion = r.resultado ? validarFactura(r.resultado) : null
              const tieneErrores = validacion && !validacion.valido
              const tieneAdvertencias = validacion && validacion.advertencias.length > 0

              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium truncate max-w-[200px]" title={r.nombre}>
                    {r.nombre}
                  </td>
                  {r.resultado ? (
                    <>
                      <td className="px-3 py-2">{r.resultado.numero ?? '-'}</td>
                      <td className="px-3 py-2 truncate max-w-[200px]" title={r.resultado.emisorReceptor ?? ''}>
                        {r.resultado.emisorReceptor ?? '-'}
                      </td>
                      <td className="px-3 py-2">{r.resultado.fechaEmision ?? '-'}</td>
                      <td className="px-3 py-2 text-right">
                        {r.resultado.total != null ? `${r.resultado.total.toFixed(2)} €` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {tieneErrores ? (
                          <Badge variant="destructive">Error</Badge>
                        ) : tieneAdvertencias ? (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {t('ocrBatch.avisos')}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            OK
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandido(expandido === i ? null : i)}
                          >
                            {expandido === i ? t('ocrBatch.ocultar') : t('ocrBatch.detalles')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => irACrearFactura(r)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('ocrBatch.crear')}
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={4}>
                        {r.error}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="destructive">Error</Badge>
                      </td>
                      <td className="px-3 py-2 text-center">-</td>
                    </>
                  )}
                  {r.resultado && expandido === i && (
                    <tr>
                      <td colSpan={7} className="px-3 py-2 bg-muted/30">
                        <ValidacionOcr resultado={validacion!} compact={false} onCorregir={(campo, sugerencia) => {
                          if (!r.resultado || !sugerencia) return
                          const mapping: Record<string, keyof OcrData> = {
                            numero: 'numero',
                            emisorReceptor: 'emisorReceptor',
                            nifContraparte: 'nifContraparte',
                            fechaEmision: 'fechaEmision',
                            baseImponible: 'baseImponible',
                            iva: 'iva',
                            total: 'total',
                            tipo: 'tipo',
                          }
                          const key = mapping[campo]
                          if (key) {
                            const resultado = r.resultado as unknown as Record<string, string | number | boolean | null | undefined>
                            resultado[key] = key === 'baseImponible' || key === 'iva' || key === 'total'
                              ? Number(sugerencia)
                              : sugerencia
                          }
                          setExpandido(null)
                          setExpandido(i)
                        }} />
                      </td>
                    </tr>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
