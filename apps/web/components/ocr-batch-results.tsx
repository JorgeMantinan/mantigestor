'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, FileText, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
          {resultados.length} procesados
        </span>
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          {exitosos.length} exitosos
        </span>
        {errores.length > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
            {errores.length} errores
          </span>
        )}
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Archivo</th>
              <th className="px-3 py-2 text-left font-medium">Nº Factura</th>
              <th className="px-3 py-2 text-left font-medium">Emisor/Receptor</th>
              <th className="px-3 py-2 text-left font-medium">Fecha</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 text-center font-medium">Estado</th>
              <th className="px-3 py-2 text-center font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r, i) => (
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
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        OK
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => irACrearFactura(r)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Crear factura
                      </Button>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
