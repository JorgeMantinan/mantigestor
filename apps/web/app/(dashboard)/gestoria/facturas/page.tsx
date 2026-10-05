'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Receipt, ArrowUpRight, Trash2, Repeat, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, CheckCircle, Clock, XCircle, FileText, Filter } from 'lucide-react'
import { BotonPDF } from '@/components/boton-pdf'
import { toast, Toaster } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { Kbd } from '@/components/ui/kbd'
import { Download } from 'lucide-react'
import { descargarExcelConResumen } from '@/lib/descargar-excel'
import { exportarContaplus, exportarSage, descargarCSV } from '@/lib/exportar-contaplus'
import { generarPDFDeHTML } from '@/lib/pdf'
import { exportarTodoZIP } from '@/lib/exportar-zip'
import { logAccion } from '@/lib/audit-log'
import { detectarDuplicados, verificarPoliticaGasto } from '@mantigestor/utils'
import { formatoMoneda } from '@/lib/divisas'
import { TAGS_PREDEFINIDOS, obtenerColorTag, parsearTags, obtenerNombreTag } from '@/lib/tags'
import { useLanguage } from '@/contexts/language-context'
import { useEmpresaActiva } from '@/contexts/empresa-activa-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { esSoloLectura } from '@/lib/resolve-perfil-activo'
import { guardarEnCache, obtenerDeCache } from '@/lib/cache-offline'

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
  tags?: string | null
  moneda?: string
  tipoCambio?: number
}

type OrdenCampo = 'fechaEmision' | 'emisorReceptor' | 'total' | 'numero'
type OrdenDireccion = 'asc' | 'desc'
const PAGE_SIZE = 10

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todas' | 'ingreso' | 'gasto'>('todas')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'pagada' | 'vencida'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(0)
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('fechaEmision')
  const [ordenDir, setOrdenDir] = useState<OrdenDireccion>('desc')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [filtroTag, setFiltroTag] = useState<string[]>([])
  const [mostrarFiltroTag, setMostrarFiltroTag] = useState(false)
  const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false)
  const filtroTagRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()
  const { empresaActiva } = useEmpresaActiva()
  const { perfilActivoId, personas, esPropio } = usePersonaActiva()
  const searchRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const personaActiva = personas.find(p => p.perfilId === perfilActivoId)
  const soloLectura = !esPropio && personaActiva && esSoloLectura(personaActiva.rol)

  const getSupabase = useCallback(() => createClient(), [])

  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onNew: () => router.push('/gestoria/facturas/nueva'),
    onFocusSearch: () => searchRef.current?.focus(),
    onFilterEstado: () => setFiltroEstado(prev => {
      const cycle: Array<'todos' | 'pendiente' | 'pagada' | 'vencida'> = ['todos', 'pendiente', 'pagada', 'vencida']
      const idx = cycle.indexOf(prev)
      return cycle[(idx + 1) % cycle.length]!
    }),
    onFilterTipo: () => setFiltro(prev => {
      const cycle: Array<'todas' | 'ingreso' | 'gasto'> = ['todas', 'ingreso', 'gasto']
      const idx = cycle.indexOf(prev)
      return cycle[(idx + 1) % cycle.length]!
    }),
  })

  const fetchFacturas = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setLoading(false); return }

      const perfilId = perfilActivoId ?? user.id
      const cacheKey = `facturas_${perfilId}${empresaActiva?.id ? `_${empresaActiva.id}` : ''}`
      const cached = obtenerDeCache<Factura[]>(cacheKey)

      if (!navigator.onLine && cached) {
        setFacturas(cached)
        setLoading(false)
        return
      }

      let query = getSupabase()
        .from('facturas')
        .select('*')
        .eq('perfilId', perfilId)
        .order('fechaEmision', { ascending: false })
        .range(0, 499)
      if (empresaActiva?.id) {
        query = query.eq('empresaId', empresaActiva.id)
      }
      const { data, error } = await query
      if (error) {
        toast.error('Error al cargar las facturas')
        return
      }
      if (data) {
        setFacturas(data as Factura[])
        guardarEnCache(cacheKey, data as Factura[])
      }
    } catch {
      toast.error('Error al cargar las facturas')
    } finally {
      setLoading(false)
    }
  }, [getSupabase, empresaActiva?.id, perfilActivoId])

  useEffect(() => { fetchFacturas() }, [fetchFacturas])

  useEffect(() => {
    if (!mostrarFiltroTag) return
    const handleClickOutside = (e: MouseEvent) => {
      if (filtroTagRef.current && !filtroTagRef.current.contains(e.target as Node)) {
        setMostrarFiltroTag(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mostrarFiltroTag])

  const eliminar = async (id: string) => {
    try {
      const factura = facturas.find(f => f.id === id)
      const { error } = await getSupabase().from('facturas').delete().eq('id', id)
      if (error) throw error
      await logAccion('eliminar', 'factura', id, `Factura ${factura?.numero ?? ''} eliminada`)
      setFacturas(prev => prev.filter(f => f.id !== id))
      toast.success('Factura eliminada')
    } catch {
      toast.error('Error al eliminar la factura')
    }
  }

  const formatMoney = (cents: number, moneda?: string) =>
    formatoMoneda(cents / 100, moneda ?? 'EUR')

  const toggleSort = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenCampo(campo)
      setOrdenDir('asc')
    }
    setPage(0)
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSeleccionAll = () => {
    if (seleccionadas.size === visibles.length) {
      setSeleccionadas(new Set())
    } else {
      setSeleccionadas(new Set(visibles.map(f => f.id)))
    }
  }

  const eliminarSeleccionadas = async () => {
    try {
      const ids = Array.from(seleccionadas)
      const { error } = await getSupabase().from('facturas').delete().in('id', ids)
      if (error) throw error
      await logAccion('eliminar', 'factura', ids.join(','), `${ids.length} facturas eliminadas`)
      setFacturas(prev => prev.filter(f => !seleccionadas.has(f.id)))
      setSeleccionadas(new Set())
      toast.success(`${ids.length} factura${ids.length !== 1 ? 's' : ''} eliminada${ids.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Error al eliminar las facturas')
    }
  }

  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  const cambiarEstadoSeleccionadas = async (nuevoEstado: string) => {
    if (cambiandoEstado) return
    setCambiandoEstado(true)
    try {
      const ids = Array.from(seleccionadas)
      const facturasSeleccionadas = facturas.filter(f => seleccionadas.has(f.id))
      const estadosAnteriores = facturasSeleccionadas.map(f => f.estado)
      const { error } = await getSupabase().from('facturas').update({ estado: nuevoEstado }).in('id', ids)
      if (error) throw error
      await logAccion('cambio_estado', 'factura', ids.join(','), `${ids.length} facturas → ${nuevoEstado}`, {
        antes: { estados: estadosAnteriores },
        despues: { estado: nuevoEstado },
      })
      setFacturas(prev => prev.map(f => seleccionadas.has(f.id) ? { ...f, estado: nuevoEstado } : f))
      setSeleccionadas(new Set())
      toast.success(`${ids.length} factura${ids.length !== 1 ? 's' : ''} marcada${ids.length !== 1 ? 's' : ''} como ${nuevoEstado}`)
    } catch {
      toast.error('Error al cambiar el estado de las facturas')
    } finally {
      setCambiandoEstado(false)
    }
  }

  const exportarSeleccionadas = () => {
    const seleccionadasFacturas = facturas.filter(f => seleccionadas.has(f.id))
    exportarExcelConResumenFacturas(seleccionadasFacturas, `facturas-seleccion-${new Date().toISOString().slice(0, 10)}`)
  }

  const exportarExcelConResumenFacturas = async (datos: Factura[], nombreBase: string) => {
    const totalIngresos = datos.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.total, 0)
    const totalGastos = datos.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.total, 0)
    const totalIva = datos.reduce((s, f) => s + f.iva, 0)
    const facturasPendientes = datos.filter(f => f.estado === 'pendiente').length
    const facturasPagadas = datos.filter(f => f.estado === 'pagada').length

    const resumen = [
      { label: 'Total facturas', value: datos.length },
      { label: 'Total ingresos', value: `${(totalIngresos / 100).toFixed(2)} €` },
      { label: 'Total gastos', value: `${(totalGastos / 100).toFixed(2)} €` },
      { label: 'Saldo neto', value: `${((totalIngresos - totalGastos) / 100).toFixed(2)} €` },
      { label: 'IVA total', value: `${(totalIva / 100).toFixed(2)} €` },
      { label: 'Facturas pendientes', value: facturasPendientes },
      { label: 'Facturas pagadas', value: facturasPagadas },
    ]

    const headers = [
      'Fecha', 'Tipo', 'Nº Factura', 'Contraparte', 'NIF',
      'Base Imponible', 'IVA', 'Total', 'Estado', 'Moneda',
      'Tipo Cambio', 'Etiquetas',
    ]
    const rows = datos.map(v => [
      v.fechaEmision.slice(0, 10),
      v.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
      v.numero || '',
      v.emisorReceptor || '',
      v.nifContraparte || '',
      (v.baseImponible / 100).toFixed(2),
      (v.iva / 100).toFixed(2),
      (v.total / 100).toFixed(2),
      v.estado || '',
      v.moneda || 'EUR',
      v.tipoCambio ?? '',
      parsearTags(v.tags).map(id => obtenerNombreTag(id)).join(', '),
    ])

    await descargarExcelConResumen(headers, rows, resumen, `${nombreBase}.xlsx`, 'Facturas')
  }

  const exportarSeleccionadasPDF = async () => {
    const seleccionadasFacturas = facturas.filter(f => seleccionadas.has(f.id))
    const rows = seleccionadasFacturas.map(v =>
      `<tr>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb">${new Date(v.fechaEmision).toLocaleDateString('es-ES')}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb">${v.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb">${v.numero}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb">${v.emisorReceptor}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right">${formatMoney(v.baseImponible, v.moneda)}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right">${v.iva}%</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold">${formatMoney(v.total, v.moneda)}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:center">${v.estado}</td>
      </tr>`
    ).join('')
    const html = `
      <h1 style="font-size:18px;margin-bottom:16px">Facturas seleccionadas (${seleccionadasFacturas.length})</h1>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:6px;text-align:left;border-bottom:2px solid #d1d5db">Fecha</th>
          <th style="padding:6px;text-align:left;border-bottom:2px solid #d1d5db">Tipo</th>
          <th style="padding:6px;text-align:left;border-bottom:2px solid #d1d5db">Nº</th>
          <th style="padding:6px;text-align:left;border-bottom:2px solid #d1d5db">Contraparte</th>
          <th style="padding:6px;text-align:right;border-bottom:2px solid #d1d5db">Base</th>
          <th style="padding:6px;text-align:right;border-bottom:2px solid #d1d5db">IVA</th>
          <th style="padding:6px;text-align:right;border-bottom:2px solid #d1d5db">Total</th>
          <th style="padding:6px;text-align:center;border-bottom:2px solid #d1d5db">Estado</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
    await generarPDFDeHTML(html, `facturas-seleccion-${new Date().toISOString().slice(0, 10)}`, { orientacion: 'landscape' })
  }

  const SortIcon = ({ campo }: { campo: OrdenCampo }) => {
    if (ordenCampo !== campo) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return ordenDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const visibles = useMemo(() => {
    let result = filtro === 'todas' ? facturas : facturas.filter(f => f.tipo === filtro)
    if (filtroEstado !== 'todos') result = result.filter(f => f.estado === filtroEstado)

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter(f =>
        f.emisorReceptor.toLowerCase().includes(q) ||
        f.numero.toLowerCase().includes(q) ||
        f.estado.toLowerCase().includes(q)
      )
    }

    if (fechaDesde) result = result.filter(f => f.fechaEmision >= fechaDesde)
    if (fechaHasta) result = result.filter(f => f.fechaEmision <= fechaHasta)

    if (filtroTag.length > 0) {
      result = result.filter(f => {
        const tags = parsearTags(f.tags)
        return filtroTag.some(ft => tags.includes(ft))
      })
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (ordenCampo) {
        case 'fechaEmision': cmp = new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime(); break
        case 'emisorReceptor': cmp = a.emisorReceptor.localeCompare(b.emisorReceptor); break
        case 'total': cmp = a.total - b.total; break
        case 'numero': cmp = a.numero.localeCompare(b.numero); break
      }
      return ordenDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [facturas, filtro, filtroEstado, busqueda, fechaDesde, fechaHasta, ordenCampo, ordenDir, filtroTag])

  const totalPages = Math.ceil(visibles.length / PAGE_SIZE)
  const paginadas = visibles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const duplicados = useMemo(() => detectarDuplicados(facturas), [facturas])

  const politicas = useMemo(() => {
    const incumplimientos = facturas.flatMap(f => verificarPoliticaGasto(f))
    return incumplimientos.slice(0, 5)
  }, [facturas])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">{t('facturas.titulo')}</h1>
          <p className="text-muted-foreground">{t('facturas.subtitulo')}</p>
          {soloLectura && (
            <span className="inline-block mt-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Solo lectura
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/gestoria/facturas/recurrentes">
            <Button variant="outline" size="sm">
              <Repeat className="mr-1 h-3 w-3" /> {t('facturas.recurrentes')}
            </Button>
          </Link>
          <BotonPDF elementId="tabla-facturas" filename={`facturas-${new Date().toISOString().slice(0, 10)}`} />
          {!soloLectura && (
            <Link href="/gestoria/facturas/nueva">
              <Button><Plus className="mr-2 h-4 w-4" /> {t('facturas.nuevaFactura')}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={searchRef}
              placeholder={t('facturas.buscarPlaceholder')}
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPage(0) }}
              className="pl-9"
              aria-label={t('facturas.buscarLabel')}
              data-search-input
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Kbd>/</Kbd>
            </div>
          </div>
          <Button variant="outline" size="sm" className="sm:hidden"
            onClick={() => setMostrarFiltrosMovil(!mostrarFiltrosMovil)}>
            <Filter className="mr-1 h-4 w-4" /> {mostrarFiltrosMovil ? 'Ocultar filtros' : 'Más filtros'}
            {(filtro !== 'todas' || filtroEstado !== 'todos' || fechaDesde || fechaHasta || filtroTag.length > 0) && (
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {(filtro !== 'todas' ? 1 : 0) + (filtroEstado !== 'todos' ? 1 : 0) + (fechaDesde ? 1 : 0) + (fechaHasta ? 1 : 0) + (filtroTag.length > 0 ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${!mostrarFiltrosMovil ? 'hidden sm:flex' : 'flex'}`}>
          <div className="flex items-center gap-2">
            <Input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setPage(0) }}
              className="w-[150px]" placeholder="Desde" aria-label="Fecha desde" />
            <span className="text-muted-foreground text-xs">—</span>
            <Input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setPage(0) }}
              className="w-[150px]" placeholder="Hasta" aria-label="Fecha hasta" />
          </div>
          <div className="flex gap-2">
            {(['todas', 'ingreso', 'gasto'] as const).map(f => (
              <Button key={f} variant={filtro === f ? 'secondary' : 'outline'} size="sm"
                onClick={() => { setFiltro(f); setPage(0) }}>
                {f === 'todas' ? t('facturas.todas') : f === 'ingreso' ? t('facturas.ingresos') : t('facturas.gastos')}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['todos', 'pendiente', 'pagada', 'vencida'] as const).map(e => (
              <Button key={e} variant={filtroEstado === e ? 'secondary' : 'outline'} size="sm"
                onClick={() => { setFiltroEstado(e); setPage(0) }}>
                {e === 'todos' ? 'Todos' : e.charAt(0).toUpperCase() + e.slice(1)}
              </Button>
            ))}
          </div>
          <div className="relative" ref={filtroTagRef}>
            <Button variant={filtroTag.length > 0 ? 'secondary' : 'outline'} size="sm"
              onClick={() => setMostrarFiltroTag(!mostrarFiltroTag)}>
              <span className="mr-1 h-3 w-3 rounded-full bg-purple-500 inline-block" />
              Etiquetas{filtroTag.length > 0 ? ` (${filtroTag.length})` : ''}
            </Button>
            {mostrarFiltroTag && (
              <div className="absolute z-50 mt-1 right-0 w-56 rounded-md border bg-popover p-2 shadow-md" role="menu">
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {TAGS_PREDEFINIDOS.map(tag => {
                    const tagInputId = `tag-filter-${tag.id}`
                    return (
                      <label key={tag.id} htmlFor={tagInputId} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent" role="menuitem">
                        <input
                          id={tagInputId}
                          type="checkbox"
                          className="rounded border-input"
                          checked={filtroTag.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFiltroTag(prev => [...prev, tag.id])
                            } else {
                              setFiltroTag(prev => prev.filter(t => t !== tag.id))
                            }
                            setPage(0)
                          }}
                        />
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.nombre}
                      </label>
                    )
                  })}
                </div>
                {filtroTag.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setFiltroTag([]); setPage(0) }}>
                      {t('facturas.limpiarFiltros')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={visibles.length === 0}
              onClick={() => exportarExcelConResumenFacturas(visibles, `facturas-${new Date().toISOString().slice(0, 10)}`)}>
              <Download className="mr-1 h-4 w-4" /> {t('facturas.exportarExcel')}
            </Button>
            <Button variant="outline" size="sm" disabled={visibles.length === 0}
              onClick={() => void exportarTodoZIP({ facturas: visibles as unknown as Record<string, unknown>[], documentos: [], nominas: [], perfil: null, propiedadesAlquiler: [], auditLog: [], notificaciones: [] })}>
              <Download className="mr-1 h-4 w-4" /> {t('facturas.exportarZip')}
            </Button>
            <Button variant="outline" size="sm" disabled={visibles.length === 0}
              onClick={() => descargarCSV(exportarContaplus(visibles), `facturas-contaplus-${new Date().toISOString().slice(0, 10)}.csv`)}>
              <Download className="mr-1 h-4 w-4" /> ContaPlus
            </Button>
            <Button variant="outline" size="sm" disabled={visibles.length === 0}
              onClick={() => descargarCSV(exportarSage(visibles), `facturas-sage-${new Date().toISOString().slice(0, 10)}.csv`)}>
              <Download className="mr-1 h-4 w-4" /> Sage
            </Button>
            <Button variant="outline" size="sm" disabled={visibles.length === 0}
              onClick={async () => {
                const { generarReporteGastosPDF } = await import('@/lib/reporte-gastos-pdf')
                const totalBase = visibles.reduce((s, v) => s + v.baseImponible, 0)
                const totalIva = visibles.reduce((s, v) => s + Math.round(v.baseImponible * v.iva / 100), 0)
                const total = visibles.reduce((s, v) => s + v.total, 0)
                await generarReporteGastosPDF({
                  titulo: 'Listado de facturas',
                  periodo: `${fechaDesde || 'Inicio'} — ${fechaHasta || 'Fin'}`,
                  lineas: visibles.map(v => ({
                    fecha: v.fechaEmision,
                    numero: v.numero,
                    contraparte: v.emisorReceptor,
                    baseImponible: v.baseImponible,
                    iva: Math.round(v.baseImponible * v.iva / 100),
                    total: v.total,
                    categoria: v.categoriaGasto ?? 'otros',
                  })),
                  totalBase, totalIva, total,
                })
              }}>
              <FileText className="mr-1 h-4 w-4" /> {t('facturas.informePdf')}
            </Button>
          </div>
        </div>
      </div>

      {duplicados.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-800 dark:bg-orange-950">
          <div className="flex items-center gap-2 font-medium text-orange-800 dark:text-orange-200">
            <AlertCircle className="h-4 w-4" />
            {t('facturas.duplicados')} ({duplicados.length})
          </div>
          <ul className="mt-1 space-y-1 text-orange-700 dark:text-orange-300">
            {duplicados.slice(0, 3).map((d, i) => (
              <li key={i} className="text-xs">
                {d.factura1.numero} ↔ {d.factura2.numero}: {d.razon}
              </li>
            ))}
            {duplicados.length > 3 && (
              <li className="text-xs">... y {duplicados.length - 3} más</li>
            )}
          </ul>
        </div>
      )}

      {politicas.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-center gap-2 font-medium text-blue-800 dark:text-blue-200">
            <AlertCircle className="h-4 w-4" />
            {t('facturas.politicas')} ({politicas.length} {t('facturas.politicasAlertas')})
          </div>
          <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-300">
            {politicas.map((p, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium">{p.facturaNumero}</span>: {p.descripcion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t('facturas.cargandoFacturas')}</CardContent></Card>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Receipt className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">
                {facturas.length === 0
                  ? t('facturas.sinFacturas')
                  : t('facturas.resultadoBusqueda')}
              </p>
              <p className="text-sm text-muted-foreground">
                {facturas.length === 0
                  ? t('facturas.primeraFactura')
                  : 'No se encontraron facturas con los filtros aplicados.'}
              </p>
            </div>
            {facturas.length === 0 && !soloLectura && (
              <Link href="/gestoria/facturas/nueva">
                <Button><Plus className="mr-2 h-4 w-4" /> {t('facturas.crearFactura')}</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {visibles.length} factura{visibles.length !== 1 ? 's' : ''}
            {busqueda && ` · Buscando "${busqueda}"`}
          </p>

          {seleccionadas.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 flex-wrap">
              <span className="text-sm font-medium">{seleccionadas.size} seleccionada{seleccionadas.size !== 1 ? 's' : ''}</span>
              <div className="flex-1" />
              {!soloLectura && (
                <div className="flex items-center gap-1 border-r pr-2">
                  <span className="text-xs text-muted-estado">Estado:</span>
                  <Button variant="outline" size="sm" disabled={cambiandoEstado} onClick={() => void cambiarEstadoSeleccionadas('pendiente')}>
                    <Clock className="mr-1 h-3 w-3" /> {cambiandoEstado ? '...' : 'Pendiente'}
                  </Button>
                  <Button variant="outline" size="sm" disabled={cambiandoEstado} onClick={() => void cambiarEstadoSeleccionadas('pagada')}>
                    <CheckCircle className="mr-1 h-3 w-3" /> {cambiandoEstado ? '...' : 'Pagada'}
                  </Button>
                  <Button variant="outline" size="sm" disabled={cambiandoEstado} onClick={() => void cambiarEstadoSeleccionadas('vencida')}>
                    <XCircle className="mr-1 h-3 w-3" /> {cambiandoEstado ? '...' : 'Vencida'}
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-1 border-r pr-2">
                <span className="text-xs text-muted-foreground">Exportar:</span>
                <Button variant="outline" size="sm" onClick={() => void exportarSeleccionadasPDF()}>
                  <Download className="mr-1 h-3 w-3" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportarSeleccionadas}>
                  <Download className="mr-1 h-3 w-3" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const sel = facturas.filter(f => seleccionadas.has(f.id))
                  descargarCSV(exportarContaplus(sel), `facturas-contaplus-${new Date().toISOString().slice(0, 10)}.csv`)
                }}>
                  <Download className="mr-1 h-3 w-3" /> ContaPlus
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const sel = facturas.filter(f => seleccionadas.has(f.id))
                  descargarCSV(exportarSage(sel), `facturas-sage-${new Date().toISOString().slice(0, 10)}.csv`)
                }}>
                  <Download className="mr-1 h-3 w-3" /> Sage
                </Button>
              </div>
              {!soloLectura && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar {seleccionadas.size} factura{seleccionadas.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                      <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void eliminarSeleccionadas()}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSeleccionadas(new Set())}>Cancelar</Button>
            </div>
          )}

          <div id="tabla-facturas" className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 w-10">
                      <label htmlFor="select-all-facturas">
                        <input
                          id="select-all-facturas"
                          type="checkbox"
                          className="rounded border-input"
                          checked={visibles.length > 0 && seleccionadas.size === visibles.length}
                          onChange={toggleSeleccionAll}
                          aria-label="Seleccionar todas"
                        />
                      </label>
                    </th>
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('numero')}>
                      Nº <SortIcon campo="numero" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('emisorReceptor')}>
                      Contraparte <SortIcon campo="emisorReceptor" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('fechaEmision')}>
                      Fecha <SortIcon campo="fechaEmision" />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Base</th>
                    <th className="px-4 py-3 text-right font-medium">IVA</th>
                    <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('total')}>
                      Total <SortIcon campo="total" />
                    </th>
                    <th className="px-4 py-3 text-center font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Etiquetas</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginadas.map(f => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <label htmlFor={`select-${f.id}`}>
                          <input
                            id={`select-${f.id}`}
                            type="checkbox"
                            className="rounded border-input"
                            checked={seleccionadas.has(f.id)}
                            onChange={() => toggleSeleccion(f.id)}
                            aria-label={`Seleccionar factura ${f.numero}`}
                          />
                        </label>
                      </td>
                      <td className="px-4 py-3 font-medium">{f.numero}</td>
                      <td className="px-4 py-3 capitalize">
                        {f.tipo === 'rectificativa' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            {f.tags?.includes('nota-credito') ? 'Crédito' : 'Débito'}
                          </span>
                        ) : f.tipo === 'ingreso' ? 'Emitida' : 'Recibida'}
                      </td>
                      <td className="px-4 py-3">{f.emisorReceptor}</td>
                      <td className="px-4 py-3">{new Date(f.fechaEmision).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(f.baseImponible, f.moneda)}</td>
                      <td className="px-4 py-3 text-right">{f.iva}%</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(f.total, f.moneda)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.estado === 'pagada'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : f.estado === 'vencida'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {f.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {parsearTags(f.tags).slice(0, 3).map(tagId => (
                            <span
                              key={tagId}
                              className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white leading-tight"
                              style={{ backgroundColor: obtenerColorTag(tagId) }}
                              title={obtenerNombreTag(tagId)}
                            >
                              {obtenerNombreTag(tagId)}
                            </span>
                          ))}
                          {parsearTags(f.tags).length > 3 && (
                            <span className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground leading-tight">
                              +{parsearTags(f.tags).length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/gestoria/facturas/${f.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ver factura"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Button>
                          </Link>
                          {!soloLectura && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Eliminar factura">
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar esta factura?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => void eliminar(f.id)}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <Toaster richColors position="top-right" />
    </div>
  )
}
