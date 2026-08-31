'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { descargarCsv } from '@/lib/descargar-csv'
import { Download, FileText, Receipt, Users, Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function BackupPage() {
  const [exportando, setExportando] = useState<string | null>(null)
  const getSupabase = useCallback(() => createClient(), [])

  const exportar = async (tabla: string, nombre: string, campos: string[]) => {
    setExportando(tabla)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) return
      const { data } = await getSupabase()
        .from(tabla)
        .select('*')
        .eq('perfilId', user.id)
      if (!data || data.length === 0) {
        toast.warning(`No hay datos en ${nombre}`)
        setExportando(null)
        return
      }
      const filas = [campos, ...data.map((row: Record<string, unknown>) => campos.map(c => String(row[c] ?? '')))]
      descargarCsv(filas, `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(`${nombre} exportado (${data.length} registros)`)
    } catch (e) {
      toast.error(`Error al exportar ${nombre}`)
    }
    setExportando(null)
  }

  const exportarTodo = async () => {
    setExportando('todo')
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) return

      const datos: Record<string, Array<Record<string, unknown>>> = {}
      const tablas = [
        { tabla: 'facturas', nombre: 'facturas', campos: ['numero', 'tipo', 'emisorReceptor', 'nifContraparte', 'fechaEmision', 'baseImponible', 'iva', 'total', 'estado', 'categoriaGasto'] },
        { tabla: 'nominas', nombre: 'nominas', campos: ['nombre', 'nif', 'bruto', 'irpf', 'seguridadSocial', 'neto', 'fecha'] },
        { tabla: 'propiedades_alquiler', nombre: 'alquiler', campos: ['nombre', 'direccion', 'alquilerMensual', 'gastosMensuales'] },
        { tabla: 'documentos', nombre: 'documentos', campos: ['nombre', 'tipo', 'url', 'subidoEn'] },
      ]

      for (const t of tablas) {
        const { data } = await getSupabase()
          .from(t.tabla)
          .select('*')
          .eq('perfilId', user.id)
        datos[t.nombre] = (data ?? []) as Array<Record<string, unknown>>
      }

      // Export each as CSV
      for (const t of tablas) {
        const d = datos[t.nombre] ?? []
        if (d.length > 0) {
          const filas = [t.campos, ...d.map(row => t.campos.map(c => String(row[c] ?? '')))]
          descargarCsv(filas, `${t.nombre}-${new Date().toISOString().slice(0, 10)}.csv`)
        }
      }

      toast.success('Backup completo exportado')
    } catch (e) {
      toast.error('Error al exportar backup')
    }
    setExportando(null)
  }

  const items = [
    { tabla: 'facturas', nombre: 'Facturas', icon: Receipt, campos: ['numero', 'tipo', 'emisorReceptor', 'nifContraparte', 'fechaEmision', 'baseImponible', 'iva', 'total', 'estado', 'categoriaGasto'] },
    { tabla: 'nominas', nombre: 'Nóminas', icon: FileText, campos: ['nombre', 'nif', 'bruto', 'irpf', 'seguridadSocial', 'neto', 'fecha'] },
    { tabla: 'propiedades_alquiler', nombre: 'Propiedades', icon: Building2, campos: ['nombre', 'direccion', 'alquilerMensual', 'gastosMensuales'] },
    { tabla: 'documentos', nombre: 'Documentos', icon: FileText, campos: ['nombre', 'tipo', 'url', 'subidoEn'] },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backup de datos</h1>
        <p className="text-muted-foreground">Exporta todos tus datos en CSV</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exportar todo</CardTitle>
          <CardDescription>Descarga un CSV por cada tabla con todos tus datos</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void exportarTodo()} disabled={exportando === 'todo'}>
            {exportando === 'todo' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar todo
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(item => (
          <Card key={item.tabla}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.nombre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => void exportar(item.tabla, item.nombre, item.campos)}
                disabled={exportando === item.tabla}
              >
                {exportando === item.tabla ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
