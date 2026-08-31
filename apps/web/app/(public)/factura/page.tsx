'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'

interface FacturaPublica {
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
  notas: string | null
}

const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export default function FacturaPublicaPage({ searchParams }: { searchParams: { token?: string } }) {
  const [factura, setFactura] = useState<FacturaPublica | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      if (!searchParams.token) {
        setError('Token no proporcionado')
        setCargando(false)
        return
      }
      try {
        const res = await fetch(`/api/factura-publica?token=${searchParams.token}`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Error al cargar factura')
          setCargando(false)
          return
        }
        setFactura(await res.json())
      } catch {
        setError('Error al conectar con el servidor')
      }
      setCargando(false)
    }
    cargar()
  }, [searchParams.token])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando factura...</p>
      </div>
    )
  }

  if (error || !factura) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">Factura no encontrada</p>
            <p className="text-sm text-muted-foreground mt-2">{error || 'Esta factura no existe o no está disponible'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Factura {factura.numero}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(factura.fechaEmision).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Badge variant={factura.estado === 'pagada' ? 'default' : 'secondary'}>
              {factura.estado}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Contraparte</p>
              <p className="text-sm font-medium">{factura.emisorReceptor}</p>
              {factura.nifContraparte && (
                <p className="text-xs text-muted-foreground">NIF: {factura.nifContraparte}</p>
              )}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Concepto</th>
                <th className="text-right py-2">Base</th>
                <th className="text-right py-2">IVA</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">{factura.emisorReceptor}</td>
                <td className="text-right py-2">{formatEuro(factura.baseImponible)}</td>
                <td className="text-right py-2">{factura.iva}%</td>
                <td className="text-right py-2 font-bold">{formatEuro(factura.total)}</td>
              </tr>
            </tbody>
          </table>

          {factura.notas && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{factura.notas}</p>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            Documento generado por MantiGestor
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
