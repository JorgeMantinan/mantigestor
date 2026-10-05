'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, FileText, Archive } from 'lucide-react'
import { exportarTodoZIP, type ExportData } from '@/lib/exportar-zip'
import { useLanguage } from '@/contexts/language-context'

export function WidgetExport() {
  const { t } = useLanguage()
  const [exportando, setExportando] = useState<'csv' | 'excel' | 'zip' | null>(null)

  const getSupabase = useCallback(() => createClient(), [])

  const cargarDatos = async (): Promise<ExportData> => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { facturas: [], documentos: [], nominas: [], perfil: null, propiedadesAlquiler: [], auditLog: [], notificaciones: [] }

    const [facturasRes, docsRes, nominasRes, perfilRes, propsRes, auditRes, notifRes] = await Promise.all([
      supabase.from('facturas').select('*').eq('perfilId', user.id).order('fechaEmision', { ascending: false }).limit(2000),
      supabase.from('documentos').select('*').eq('perfilId', user.id).limit(1000),
      supabase.from('nominas').select('*').eq('perfilId', user.id).limit(500),
      supabase.from('perfiles').select('*').eq('userId', user.id).single(),
      supabase.from('propiedades_alquiler').select('*').eq('perfilId', user.id).limit(500),
      supabase.from('audit_log').select('*').eq('perfilId', user.id).order('createdAt', { ascending: false }).limit(500),
      supabase.from('notificaciones').select('*').eq('perfilId', user.id).order('creadoEn', { ascending: false }).limit(200),
    ])

    return {
      facturas: (facturasRes.data as Record<string, unknown>[]) ?? [],
      documentos: (docsRes.data as Record<string, unknown>[]) ?? [],
      nominas: (nominasRes.data as Record<string, unknown>[]) ?? [],
      perfil: (perfilRes.data as Record<string, unknown>) ?? null,
      propiedadesAlquiler: (propsRes.data as Record<string, unknown>[]) ?? [],
      auditLog: (auditRes.data as Record<string, unknown>[]) ?? [],
      notificaciones: (notifRes.data as Record<string, unknown>[]) ?? [],
    }
  }

  const toCsv = (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return ''
    const headers = Object.keys(rows[0]!)
    const lines = rows.map(r =>
      headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';')
    )
    return '\uFEFF' + headers.join(';') + '\n' + lines.join('\n')
  }

  const descargarCsv = async () => {
    setExportando('csv')
    try {
      const data = await cargarDatos()
      const csv = toCsv(data.facturas)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mantigestor-facturas-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    setExportando(null)
  }

  const descargarExcel = async () => {
    setExportando('excel')
    try {
      const data = await cargarDatos()
      const csv = toCsv(data.facturas)
      const blob = new Blob(['\uFEFF' + csv], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mantigestor-facturas-${new Date().toISOString().slice(0, 10)}.xls`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    setExportando(null)
  }

  const descargarZip = async () => {
    setExportando('zip')
    try {
      const data = await cargarDatos()
      await exportarTodoZIP(data)
    } catch { /* ignore */ }
    setExportando(null)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Download className="h-4 w-4" aria-hidden="true" />
          {t('widgetExport.exportacionRapida')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            disabled={exportando !== null}
            onClick={descargarCsv}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {exportando === 'csv' ? t('widgetExport.exportando') : t('widgetExport.exportarFacturasCsv')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            disabled={exportando !== null}
            onClick={descargarExcel}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            {exportando === 'excel' ? t('widgetExport.exportando') : t('widgetExport.exportarFacturasExcel')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            disabled={exportando !== null}
            onClick={descargarZip}
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            {exportando === 'zip' ? t('widgetExport.exportando') : t('widgetExport.exportarTodoZip')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
