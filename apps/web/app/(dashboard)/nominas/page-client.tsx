'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Plus, Briefcase, User, TrendingDown, TrendingUp, Search } from 'lucide-react'
import { NominaForm } from '@/components/nominas/nomina-form'
import { NominaTable } from '@/components/nominas/nomina-table'
import { Toaster, toast } from 'sonner'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { Download } from 'lucide-react'
import { descargarExcel } from '@/lib/descargar-excel'
import { generarNominaPDF } from '@/lib/nomina-pdf'
import { useLanguage } from '@/contexts/language-context'
import { useEmpresaActiva } from '@/contexts/empresa-activa-context'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { esSoloLectura } from '@/lib/resolve-perfil-activo'

type OrdenCampo = 'empleada' | 'mes' | 'salarioBruto' | 'neto'
type OrdenDireccion = 'asc' | 'desc'
const PAGE_SIZE = 10

interface Nomina {
  id: string
  empleada: string
  mes: number
  anyo: number
  salarioBruto: number
  irpf: number
  seguridadSocial: number
  neto: number
  rol: 'jefe' | 'empleado'
  pdfUrl?: string | null
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export default function NominasPage() {
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [showForm, setShowForm] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [anyoFiltro, setAnyoFiltro] = useState(new Date().getFullYear())
  const [rolDefecto, setRolDefecto] = useState<'jefe' | 'empleado'>('jefe')
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<'todas' | 'jefe' | 'empleado'>('todas')
  const [page, setPage] = useState(0)
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('empleada')
  const [ordenDir, setOrdenDir] = useState<OrdenDireccion>('asc')
  const searchRef = useRef<HTMLInputElement>(null)
  const getSupabase = useCallback(() => createClient(), [])
  const { t } = useLanguage()
  const { empresaActiva } = useEmpresaActiva()
  const { perfilActivoId, personas, esPropio } = usePersonaActiva()
  const personaActiva = personas.find(p => p.perfilId === perfilActivoId)
  const soloLectura = !esPropio && personaActiva && esSoloLectura(personaActiva.rol)

  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onNew: () => !soloLectura && setShowForm(true),
    onEscape: () => setShowForm(false),
  })

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      let perfilId = perfilActivoId
      if (!perfilId) {
        const { data: perfil } = await supabase.from('perfiles').select('id').eq('userId', user.id).single()
        if (!perfil) return
        perfilId = perfil.id
      }

      let query = supabase
        .from('nominas')
        .select('*')
        .eq('perfilId', perfilId)
        .eq('anyo', anyoFiltro)
        .order('mes', { ascending: false })
        .limit(500)
      if (empresaActiva?.id) {
        query = query.eq('empresaId', empresaActiva.id)
      }

      const { data } = await query

      if (data) setNominas(data as Nomina[])
    }
    init()
  }, [getSupabase, anyoFiltro, empresaActiva?.id, perfilActivoId])

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGuardando(true)
    const form = new FormData(e.currentTarget)
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }

    let perfilId = perfilActivoId
    if (!perfilId) {
      const { data: perfil } = await supabase.from('perfiles').select('id').eq('userId', user.id).single()
      if (!perfil) { setGuardando(false); return }
      perfilId = perfil.id
    }

    const salarioBruto = parseFloat(form.get('salarioBruto') as string) * 100
    const irpf = parseFloat(form.get('irpf') as string)
    const seguridadSocial = parseFloat(form.get('seguridadSocial') as string) * 100
    const rol = form.get('rol') as 'jefe' | 'empleado'
    const descIrpf = Math.round(salarioBruto * (irpf / 100))
    const neto = salarioBruto - descIrpf - seguridadSocial

    const { error } = await supabase.from('nominas').insert({
      id: crypto.randomUUID(),
      perfilId,
      empleada: form.get('empleada') as string,
      mes: parseInt(form.get('mes') as string, 10),
      anyo: parseInt(form.get('anyo') as string, 10),
      salarioBruto,
      irpf,
      seguridadSocial,
      neto,
      rol,
      pdfUrl: pdfUrl || null,
    })

    if (!error) {
      setNominas(prev => [{
        id: crypto.randomUUID(),
        empleada: form.get('empleada') as string,
        mes: parseInt(form.get('mes') as string, 10),
        anyo: parseInt(form.get('anyo') as string, 10),
        salarioBruto,
        irpf,
        seguridadSocial,
        neto,
        rol,
        pdfUrl: pdfUrl || null,
      }, ...prev].sort((a, b) => b.mes - a.mes))
      toast.success(t('nominas.nominaGuardada'))
    }

    setShowForm(false)
    setPdfUrl(null)
    setGuardando(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('nominas').delete().eq('id', id)
    setNominas(prev => prev.filter(n => n.id !== id))
    toast.success(t('nominas.nominaEliminada'))
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

  const visibles = useMemo(() => {
    let result = filtroRol === 'todas' ? nominas : nominas.filter(n => n.rol === filtroRol)

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      result = result.filter(n => n.empleada.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (ordenCampo) {
        case 'empleada': cmp = a.empleada.localeCompare(b.empleada); break
        case 'mes': cmp = a.mes - b.mes; break
        case 'salarioBruto': cmp = a.salarioBruto - b.salarioBruto; break
        case 'neto': cmp = a.neto - b.neto; break
      }
      return ordenDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [nominas, filtroRol, busqueda, ordenCampo, ordenDir])

  const totalPages = Math.ceil(visibles.length / PAGE_SIZE)
  const paginadas = visibles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Totales por rol
  const jefe = nominas.filter(n => n.rol === 'jefe')
  const empleado = nominas.filter(n => n.rol === 'empleado')

  const totalBrutoJefe = jefe.reduce((s, n) => s + n.salarioBruto, 0)
  const totalIrpfJefe = jefe.reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0)
  const totalNetoJefe = jefe.reduce((s, n) => s + n.neto, 0)

  const totalBrutoEmp = empleado.reduce((s, n) => s + n.salarioBruto, 0)
  const totalIrpfEmp = empleado.reduce((s, n) => s + Math.round(n.salarioBruto * (n.irpf / 100)), 0)

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">{t('nominas.titulo')}</h1>
            <p className="text-muted-foreground">
              {t('nominas.subtitulo')}
            </p>
            {soloLectura && (
              <span className="inline-block mt-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Solo lectura
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={rolDefecto === 'jefe' ? 'secondary' : 'ghost'}
                onClick={() => setRolDefecto('jefe')}
                className="gap-1 text-xs"
              >
                <Briefcase className="h-3 w-3" aria-hidden="true" />
                {t('nominas.soyJefe')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={rolDefecto === 'empleado' ? 'secondary' : 'ghost'}
                onClick={() => setRolDefecto('empleado')}
                className="gap-1 text-xs"
              >
                <User className="h-3 w-3" aria-hidden="true" />
                {t('nominas.soyEmpleada')}
              </Button>
            </div>
            {!soloLectura && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('nominas.nuevaNomina')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[anyoFiltro - 1, anyoFiltro, anyoFiltro + 1].map(a => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant={a === anyoFiltro ? 'secondary' : 'outline'}
              onClick={() => setAnyoFiltro(a)}
            >
              {a}
            </Button>
          ))}
        </div>

        {/* Búsqueda + filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={searchRef}
              placeholder={t('nominas.buscarPlaceholder')}
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPage(0) }}
              className="pl-9"
              aria-label="Buscar nóminas"
            />
          </div>
          <div className="flex gap-2">
            {(['todas', 'jefe', 'empleado'] as const).map(f => (
              <Button key={f} variant={filtroRol === f ? 'secondary' : 'outline'} size="sm"
                onClick={() => { setFiltroRol(f); setPage(0) }}>
                {f === 'todas' ? t('nominas.todas') : f === 'jefe' ? t('nominas.jefe') : t('nominas.empleada')}
              </Button>
            ))}
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" disabled={visibles.length === 0}
            onClick={() => {
              const headers = ['Empleada', 'Rol', 'Mes', 'Año', 'Salario Bruto', 'IRPF', 'Seg. Social', 'Neto']
              const rows = visibles.map(n => [
                n.empleada, n.rol === 'jefe' ? 'Jefe' : 'Empleada',
                n.mes.toString(), n.anyo.toString(),
                (n.salarioBruto / 100).toFixed(2), (n.irpf / 100).toFixed(2),
                (n.seguridadSocial / 100).toFixed(2), (n.neto / 100).toFixed(2)
              ])
              descargarExcel(headers, rows, `nominas-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Nóminas')
            }}>
            <Download className="mr-1 h-4 w-4" /> {t('nominas.exportarExcel')}
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            const { generarPDFDeHTML } = await import('@/lib/pdf')
            const formatEuro = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
            const totalBruto = visibles.reduce((s, n) => s + n.salarioBruto, 0)
            const totalIrpf = visibles.reduce((s, n) => s + n.irpf, 0)
            const totalSs = visibles.reduce((s, n) => s + n.seguridadSocial, 0)
            const totalNeto = visibles.reduce((s, n) => s + n.neto, 0)
            const html = `
              <div style="font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a">
                <h1 style="font-size:24px;font-weight:800;margin:0 0 4px 0">Resumen de nóminas</h1>
                <p style="font-size:13px;color:#6b7280;margin:0 0 24px 0">Periodo: ${anyoFiltro}</p>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
                  <thead><tr style="background:#1a1a1a;color:white">
                    <th style="padding:10px 12px;text-align:left;font-size:11px">Empleada</th>
                    <th style="padding:10px 12px;text-align:left;font-size:11px">Rol</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px">Mes</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px">Bruto</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px">IRPF</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px">Seg. Social</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px">Neto</th>
                  </tr></thead>
                  <tbody>${visibles.map((n, i) => `
                    <tr style="border-bottom:1px solid #e5e7eb;${i % 2 ? 'background:#f9fafb' : ''}">
                      <td style="padding:8px 12px;font-size:12px">${n.empleada}</td>
                      <td style="padding:8px 12px;font-size:12px">${n.rol === 'jefe' ? 'Jefe' : 'Empleada'}</td>
                      <td style="padding:8px 12px;font-size:12px;text-align:center">${n.mes}/${n.anyo}</td>
                      <td style="padding:8px 12px;font-size:12px;text-align:right">${formatEuro(n.salarioBruto)}</td>
                      <td style="padding:8px 12px;font-size:12px;text-align:right;color:#ef4444">${formatEuro(n.irpf)}</td>
                      <td style="padding:8px 12px;font-size:12px;text-align:right;color:#f97316">${formatEuro(n.seguridadSocial)}</td>
                      <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:600">${formatEuro(n.neto)}</td>
                    </tr>`).join('')}
                  </tbody>
                  <tfoot><tr style="background:#f3f4f6;font-weight:700">
                    <td style="padding:10px 12px;font-size:12px" colspan="3">Total (${visibles.length} nóminas)</td>
                    <td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(totalBruto)}</td>
                    <td style="padding:10px 12px;font-size:12px;text-align:right;color:#ef4444">${formatEuro(totalIrpf)}</td>
                    <td style="padding:10px 12px;font-size:12px;text-align:right;color:#f97316">${formatEuro(totalSs)}</td>
                    <td style="padding:10px 12px;font-size:12px;text-align:right">${formatEuro(totalNeto)}</td>
                  </tr></tfoot>
                </table>
                <p style="font-size:9px;color:#9ca3af;text-align:center">Generado por MantiGestor</p>
              </div>`
            await generarPDFDeHTML(html, `nominas-${anyoFiltro}`, { orientacion: 'landscape' })
          }}>
            <Download className="mr-1 h-4 w-4" /> {t('nominas.informePDF')}
          </Button>
        </div>

        {showForm && (
          <NominaForm
            rolDefecto={rolDefecto}
            anyoFiltro={anyoFiltro}
            userId={userId}
            perfilId={perfilActivoId ?? userId ?? undefined}
            guardando={guardando}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            onUploadComplete={(url) => setPdfUrl(url)}
          />
        )}

        {/* Resumen */}
        {nominas.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {jefe.length > 0 && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('nominas.gastoDeducible')}</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatMoney(totalBrutoJefe)}</div>
                    <p className="text-xs text-muted-foreground">{jefe.length} {t('nominas.todas').toLowerCase()} Â· {formatMoney(totalIrpfJefe)} {t('dashboard.irpfRetenido')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('nominas.totalNeto')}</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(totalNetoJefe)}</div>
                    <p className="text-xs text-muted-foreground">{t('nominas.salarioNeto')}</p>
                  </CardContent>
                </Card>
              </>
            )}
            {empleado.length > 0 && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('nominas.brutoRecibido')}</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatMoney(totalBrutoEmp)}</div>
                    <p className="text-xs text-muted-foreground">{empleado.length} {t('nominas.todas').toLowerCase()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('nominas.irpfRetenido')}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatMoney(totalIrpfEmp)}</div>
                    <p className="text-xs text-muted-foreground">{t('nominas.descuentoDeclaracion')}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {nominas.length === 0 && !showForm && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">{t('nominas.sinNominas')} {anyoFiltro}</p>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.anadirNominas')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {visibles.length > 0 && (
          <NominaTable
            paginadas={paginadas}
            visibles={visibles}
            page={page}
            totalPages={totalPages}
            ordenCampo={ordenCampo}
            ordenDir={ordenDir}
            busqueda={busqueda}
            toggleSort={toggleSort}
            setPage={setPage}
            onDelete={handleDelete}
            onDownloadPdf={(n) => void generarNominaPDF(n)}
            soloLectura={soloLectura}
          />
        )}
      </div>
      <Toaster richColors position="top-right" />
    </>
  )
}
