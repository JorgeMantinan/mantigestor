'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FileText, ArrowUpRight, Trash2, Copy, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Send, CheckCircle, XCircle } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import {
  type Proforma,
  type ProformaEstado,
  COLOR_ESTADO_PROFORMA,
  ESTADOS_PROFORMA,
  listarProformas,
  eliminarProforma,
  actualizarEstadoProforma,
  convertirAFactura,
  duplicarProforma,
} from '@/lib/proforma'
import { logAccion } from '@/lib/audit-log'
import { generarPDFDeHTML } from '@/lib/pdf'
import { BotonPDF } from '@/components/boton-pdf'

type OrdenCampo = 'fechaEmision' | 'emisorReceptor' | 'total' | 'numero'
type OrdenDireccion = 'asc' | 'desc'
const PAGE_SIZE = 10

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function ProformasPage() {
  const [proformas, setProformas] = useState<Proforma[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | ProformaEstado>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(0)
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('fechaEmision')
  const [ordenDir, setOrdenDir] = useState<OrdenDireccion>('desc')
  const searchRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const getSupabase = useCallback(() => createClient(), [])

  const fetchProformas = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) { setLoading(false); return }
      const data = await listarProformas(user.id)
      setProformas(data)
    } catch {
      toast.error('Error al cargar proformas')
    }
    setLoading(false)
  }, [getSupabase])

  useEffect(() => { fetchProformas() }, [fetchProformas])

  const handleEliminar = async (id: string) => {
    try {
      await eliminarProforma(id)
      await logAccion('eliminar', 'factura', id, 'Proforma eliminada')
      setProformas(prev => prev.filter(p => p.id !== id))
      toast.success('Proforma eliminada')
    } catch {
      toast.error('Error al eliminar proforma')
    }
  }

  const handleCambiarEstado = async (id: string, nuevoEstado: ProformaEstado) => {
    try {
      await actualizarEstadoProforma(id, nuevoEstado)
      await logAccion('cambio_estado', 'factura', id, `Proforma → ${nuevoEstado}`)
      setProformas(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
      toast.success(`Proforma marcada como ${nuevoEstado}`)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const handleConvertir = async (id: string) => {
    try {
      const nuevaFacturaId = await convertirAFactura(id)
      await logAccion('cambio_estado', 'factura', id, 'Proforma convertida a factura')
      setProformas(prev => prev.map(p => p.id === id ? { ...p, estado: 'aceptada' as const } : p))
      toast.success('Proforma convertida a factura', {
        description: `Nueva factura creada`,
        action: {
          label: 'Ver factura',
          onClick: () => router.push(`/gestoria/facturas/${nuevaFacturaId}`),
        },
      })
    } catch {
      toast.error('Error al convertir proforma')
    }
  }

  const handleDuplicar = async (id: string) => {
    try {
      const duplicada = await duplicarProforma(id)
      await logAccion('crear', 'factura', duplicada.id, 'Proforma duplicada')
      setProformas(prev => [duplicada, ...prev])
      toast.success('Proforma duplicada')
    } catch {
      toast.error('Error al duplicar proforma')
    }
  }

  const toggleSort = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenCampo(campo)
      setOrdenDir('asc')
    }
    setPage(0)
  }

  const SortIcon = ({ campo }: { campo: OrdenCampo }) => {
    if (ordenCampo !== campo) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return ordenDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const exportarPDF = async (proforma: Proforma) => {
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
          <div>
            <h1 style="font-size:28px;font-weight:800;margin:0;color:#1a1a1a">PROFORMA</h1>
            <p style="font-size:14px;color:#6b7280;margin:4px 0 0 0">Nº ${proforma.numero}</p>
          </div>
          <div style="text-align:right">
            <p style="font-size:14px;color:#6b7280;margin:0">Estado: <strong>${proforma.estado.toUpperCase()}</strong></p>
            ${proforma.fechaVencimiento ? `<p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">Válido hasta: ${new Date(proforma.fechaVencimiento).toLocaleDateString('es-ES')}</p>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
          <div style="background:#f9fafb;border-radius:8px;padding:16px">
            <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0">Cliente</p>
            <p style="font-size:14px;font-weight:600;margin:0">${proforma.emisorReceptor}</p>
            ${proforma.nifContraparte ? `<p style="font-size:12px;color:#6b7280;margin:2px 0 0 0">NIF: ${proforma.nifContraparte}</p>` : ''}
          </div>
          <div style="background:#f9fafb;border-radius:8px;padding:16px">
            <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin:0 0 8px 0">Fecha</p>
            <p style="font-size:14px;font-weight:600;margin:0">${new Date(proforma.fechaEmision).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#1a1a1a;color:white">
              <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600">Concepto</th>
              <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">Base</th>
              <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">IVA</th>
              <th style="padding:12px 16px;text-align:right;font-size:12px;font-weight:600">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb">
              <td style="padding:12px 16px;font-size:13px">Servicio — ${proforma.emisorReceptor}</td>
              <td style="padding:12px 16px;text-align:right;font-size:13px">${formatMoney(proforma.baseImponible)}</td>
              <td style="padding:12px 16px;text-align:right;font-size:13px">${proforma.iva}%</td>
              <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600">${formatMoney(proforma.total)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background:#f3f4f6">
              <td style="padding:12px 16px;font-weight:700;font-size:14px" colspan="3">Total</td>
              <td style="padding:12px 16px;text-align:right;font-weight:800;font-size:18px">${formatMoney(proforma.total)}</td>
            </tr>
          </tfoot>
        </table>
        ${proforma.notas ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px"><p style="font-size:12px;margin:0;color:#1e40af"><strong>Notas:</strong> ${proforma.notas}</p></div>` : ''}
        <div style="margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center">
          <p style="margin:0">Documento generado por MantiGestor</p>
        </div>
      </div>
    `
    await generarPDFDeHTML(html, `proforma-${proforma.numero}`, { orientacion: 'portrait' })
  }

  const visibles = useMemo(() => {
    let result = proformas
    if (filtroEstado !== 'todos') result = result.filter(p => p.estado === filtroEstado)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter(p =>
        p.emisorReceptor.toLowerCase().includes(q) ||
        p.numero.toLowerCase().includes(q)
      )
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
  }, [proformas, filtroEstado, busqueda, ordenCampo, ordenDir])

  const totalPages = Math.ceil(visibles.length / PAGE_SIZE)
  const paginadas = visibles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Proformas</h1>
          <p className="text-muted-foreground">Gestiona tus proformas y presupuestos</p>
        </div>
        <div className="flex gap-2">
          <BotonPDF elementId="tabla-proformas" filename={`proformas-${new Date().toISOString().slice(0, 10)}`} />
          <Link href="/gestoria/facturas/nueva">
            <Button><Plus className="mr-2 h-4 w-4" /> Nueva proforma</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={searchRef}
            placeholder="Buscar por contraparte, nº proforma..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPage(0) }}
            className="pl-9"
            aria-label="Buscar proformas"
          />
        </div>
        <div className="flex gap-2">
          {(['todos', ...ESTADOS_PROFORMA] as const).map(e => (
            <Button key={e} variant={filtroEstado === e ? 'secondary' : 'outline'} size="sm"
              onClick={() => { setFiltroEstado(e); setPage(0) }}>
              {e === 'todos' ? 'Todos' : e.charAt(0).toUpperCase() + e.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando proformas...</CardContent></Card>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No hay {busqueda ? 'resultados' : 'proformas'}</p>
              <p className="text-sm text-muted-foreground">
                {busqueda ? 'Prueba con otra búsqueda' : 'Crea tu primera proforma para empezar'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {visibles.length} proforma{visibles.length !== 1 ? 's' : ''}
          </p>

          <div id="tabla-proformas" className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('numero')}>
                      Nº <SortIcon campo="numero" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('emisorReceptor')}>
                      Contraparte <SortIcon campo="emisorReceptor" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('fechaEmision')}>
                      Fecha <SortIcon campo="fechaEmision" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Validez</th>
                    <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('total')}>
                      Total <SortIcon campo="total" />
                    </th>
                    <th className="px-4 py-3 text-center font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginadas.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.numero}</td>
                      <td className="px-4 py-3">{p.emisorReceptor}</td>
                      <td className="px-4 py-3">{new Date(p.fechaEmision).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.fechaVencimiento
                          ? new Date(p.fechaVencimiento).toLocaleDateString('es-ES')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(p.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO_PROFORMA[p.estado]}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {p.estado === 'borrador' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Enviar"
                              onClick={() => void handleCambiarEstado(p.id, 'enviada')}>
                              <Send className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          {p.estado === 'enviada' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Aceptar"
                                onClick={() => void handleConvertir(p.id)}>
                                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="Rechazar"
                                onClick={() => void handleCambiarEstado(p.id, 'rechazada')}>
                                <XCircle className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicar"
                            onClick={() => void handleDuplicar(p.id)}>
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportar PDF"
                            onClick={() => void exportarPDF(p)}>
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Eliminar proforma">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar esta proforma?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleEliminar(p.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
