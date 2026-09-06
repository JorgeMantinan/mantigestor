'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { descargarCsv } from '@/lib/descargar-csv'
import { exportarTodoZIP, type ExportData } from '@/lib/exportar-zip'
import { Download, FileText, Receipt, Building2, Loader2, Shield, Bell, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'

interface TableCounts {
  facturas: number
  documentos: number
  nominas: number
  propiedadesAlquiler: number
  auditLog: number
  notificaciones: number
  perfil: boolean
}

interface TableConfig {
  key: keyof Omit<TableCounts, 'perfil'>
  tabla: string
  nombre: string
  icon: React.ReactNode
  campos: string[]
}

const TABLES: TableConfig[] = [
  { key: 'facturas', tabla: 'facturas', nombre: 'Facturas', icon: <Receipt className="h-4 w-4" aria-hidden="true" />, campos: ['numero', 'tipo', 'emisorReceptor', 'nifContraparte', 'fechaEmision', 'baseImponible', 'iva', 'total', 'estado', 'categoriaGasto'] },
  { key: 'nominas', tabla: 'nominas', nombre: 'Nóminas', icon: <FileText className="h-4 w-4" aria-hidden="true" />, campos: ['nombre', 'nif', 'bruto', 'irpf', 'seguridadSocial', 'neto', 'fecha'] },
  { key: 'propiedadesAlquiler', tabla: 'propiedades_alquiler', nombre: 'Alquiler', icon: <Building2 className="h-4 w-4" aria-hidden="true" />, campos: ['nombre', 'direccion', 'alquilerMensual', 'gastosMensuales'] },
  { key: 'documentos', tabla: 'documentos', nombre: 'Documentos', icon: <FileText className="h-4 w-4" aria-hidden="true" />, campos: ['nombre', 'tipo', 'url', 'subidoEn'] },
  { key: 'auditLog', tabla: 'audit_log', nombre: 'Actividad', icon: <Shield className="h-4 w-4" aria-hidden="true" />, campos: ['accion', 'entidad', 'entidadId', 'detalle', 'creadoEn'] },
  { key: 'notificaciones', tabla: 'notificaciones', nombre: 'Notificaciones', icon: <Bell className="h-4 w-4" aria-hidden="true" />, campos: ['tipo', 'leido', 'contenido', 'creadoEn'] },
]

export default function BackupPage() {
  const { t } = useLanguage()
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [counts, setCounts] = useState<TableCounts>({
    facturas: 0, documentos: 0, nominas: 0,
    propiedadesAlquiler: 0, auditLog: 0, notificaciones: 0, perfil: false,
  })
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState<string | null>(null)
  const getSupabase = useCallback(() => createClient(), [])

  const cargarConteos = useCallback(async () => {
    setCargando(true)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setCargando(false); return }

      const { data: perfil } = await getSupabase()
        .from('perfiles')
        .select('id')
        .eq('userId', user.id)
        .maybeSingle()

      const perfilId = perfil?.id ?? user.id

      const queries = TABLES.map(async tabla => {
        let query = getSupabase()
          .from(tabla.tabla)
          .select('id', { count: 'exact', head: true })
          .eq('perfilId', perfilId)
        if (fechaDesde) query = query.gte(tabla.key === 'auditLog' || tabla.key === 'notificaciones' ? 'creadoEn' : 'createdAt', fechaDesde)
        if (fechaHasta) query = query.lte(tabla.key === 'auditLog' || tabla.key === 'notificaciones' ? 'creadoEn' : 'createdAt', fechaHasta + 'T23:59:59')
        const { count } = await query
        return { key: tabla.key, count: count ?? 0 }
      })

      const results = await Promise.all(queries)
      const newCounts: TableCounts = {
        facturas: 0, documentos: 0, nominas: 0,
        propiedadesAlquiler: 0, auditLog: 0, notificaciones: 0,
        perfil: !!perfil,
      }
      for (const r of results) {
        newCounts[r.key] = r.count
      }
      setCounts(newCounts)
    } catch {
      toast.error(t('backup.errorCargarDatos'))
    }
    setCargando(false)
  }, [getSupabase, fechaDesde, fechaHasta, t])

  useEffect(() => { cargarConteos() }, [cargarConteos])

  const fetchTabla = async (tabla: TableConfig): Promise<Record<string, unknown>[]> => {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) return []
    const { data: perfil } = await getSupabase()
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .maybeSingle()
    const perfilId = perfil?.id ?? user.id
    const dateField = tabla.key === 'auditLog' || tabla.key === 'notificaciones' ? 'creadoEn' : 'createdAt'
    let query = getSupabase().from(tabla.tabla).select('*').eq('perfilId', perfilId)
    if (fechaDesde) query = query.gte(dateField, fechaDesde)
    if (fechaHasta) query = query.lte(dateField, fechaHasta + 'T23:59:59')
    const { data } = await query
    return (data ?? []) as Record<string, unknown>[]
  }

  const exportarCSV = async (tabla: TableConfig) => {
    setExportando(tabla.key)
    try {
      const data = await fetchTabla(tabla)
      if (data.length === 0) {
        toast.warning(`No hay datos en ${tabla.nombre}`)
        setExportando(null)
        return
      }
      const filas = [tabla.campos, ...data.map(row => tabla.campos.map(c => String(row[c] ?? '')))]
      descargarCsv(filas, `${tabla.nombre}-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(`${tabla.nombre} exportado (${data.length} registros)`)
    } catch {
      toast.error(`Error al exportar ${tabla.nombre}`)
    }
    setExportando(null)
  }

  const exportarTodo = async () => {
    setExportando('todo')
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { toast.error(t('backup.noAutenticado')); setExportando(null); return }

      const { data: perfil } = await getSupabase()
        .from('perfiles')
        .select('*')
        .eq('userId', user.id)
        .maybeSingle()

      const allData: ExportData = {
        facturas: [], documentos: [], nominas: [],
        propiedadesAlquiler: [], auditLog: [], notificaciones: [],
        perfil: (perfil as Record<string, unknown>) ?? null,
      }

      const queries = TABLES.map(async tabla => {
        const data = await fetchTabla(tabla)
        return { key: tabla.key, data }
      })

      const results = await Promise.all(queries)
      for (const r of results) {
        allData[r.key] = r.data
      }

      await exportarTodoZIP(allData)
      toast.success(t('backup.backupCompleto'))
    } catch {
      toast.error(t('backup.errorExportarBackup'))
    }
    setExportando(null)
  }

  const totalRegistros = Object.entries(counts)
    .filter(([k]) => k !== 'perfil')
    .reduce((sum, [, v]) => sum + (v as number), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('backup.titulo')}</h1>
        <p className="text-muted-foreground">{t('backup.subtitulo')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('backup.filtroFechas')}</CardTitle>
          <CardDescription>{t('backup.descripcionFiltro')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('backup.desde')}</span>
              <Input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('backup.hasta')}</span>
              <Input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="w-[160px]"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <Button variant="ghost" size="sm" onClick={() => { setFechaDesde(''); setFechaHasta('') }}>
                {t('backup.limpiar')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('backup.resumen')}</CardTitle>
          <CardDescription>
            {cargando ? t('backup.cargando') : `${totalRegistros} ${t('backup.registrosEnTablas')} ${TABLES.length} ${t('backup.tablas')}${counts.perfil ? ` ${t('backup.masPerfil')}` : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('backup.cargandoConteos')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TABLES.map(tabla => (
                <div key={tabla.key} className="flex items-center gap-2 rounded-lg border p-3">
                  <span className="text-muted-foreground">{tabla.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{tabla.nombre}</p>
                    <p className="text-xs text-muted-foreground">{counts[tabla.key]} {t('backup.registros')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Archive className="h-4 w-4" aria-hidden="true" />
            {t('backup.exportarTodoSistema')}
          </CardTitle>
          <CardDescription>{t('backup.descripcionZip')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void exportarTodo()} disabled={exportando === 'todo' || totalRegistros === 0}>
            {exportando === 'todo' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {exportando === 'todo' ? t('backup.exportando') : t('backup.exportarTodoSistemaZip')}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TABLES.map(tabla => (
          <Card key={tabla.key}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                {tabla.icon}
                {tabla.nombre}
              </CardTitle>
              <CardDescription>{counts[tabla.key]} {t('backup.registros')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => void exportarCSV(tabla)}
                disabled={exportando === tabla.key || counts[tabla.key] === 0}
              >
                {exportando === tabla.key ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {exportando === tabla.key ? t('backup.exportando') : t('backup.exportarCsv')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
