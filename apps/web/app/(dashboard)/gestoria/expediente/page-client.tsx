'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Receipt, TrendingUp, TrendingDown, PiggyBank, Calendar, BadgeCheck,
  Building2, FileText, Calculator, ArrowRight, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { proximosPlazos, getCalendarioFiscal } from '@mantigestor/utils'
import { GUIAS_PERFIL, type GuiaPerfil } from '@/lib/fiscal/guias-perfil'

interface Factura {
  id: string
  tipo: string
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
}

interface Perfil {
  id: string
  nombre: string | null
  email: string
  nif: string | null
  comunidadFiscal: string | null
  perfilFiscal: string | null
}

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

function fechaISO(f: Factura): string {
  const d = new Date(f.fechaEmision)
  return Number.isNaN(d.getTime()) ? f.fechaEmision : d.toLocaleDateString('es-ES')
}

export function ExpedientePageClient() {
  const { perfilActivoId, personas } = usePersonaActiva()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [hayGestion, setHayGestion] = useState(false)
  const getSupabase = useCallback(() => createClient(), [])

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      let perfilId = user.id
      if (perfilActivoId) {
        perfilId = perfilActivoId
        setHayGestion(true)
      }

      const [{ data: perfilData }, facturasRes] = await Promise.all([
        supabase.from('perfiles').select('*').eq('id', perfilId).maybeSingle(),
        supabase
          .from('facturas')
          .select('*')
          .eq('perfilId', perfilId)
          .gte('fechaEmision', `${currentYear}-01-01`)
          .lt('fechaEmision', `${currentYear + 1}-01-01`)
          .order('fechaEmision', { ascending: false })
          .limit(200),
      ])

      const personaActiva = personas.find(p => p.perfilId === perfilActivoId)
      setPerfil({
        id: perfilId,
        nombre: perfilData?.nombre ?? personaActiva?.nombre ?? null,
        email: personaActiva?.email ?? user.email ?? '',
        nif: perfilData?.nif ?? null,
        comunidadFiscal: perfilData?.comunidadFiscal ?? null,
        perfilFiscal: perfilData?.perfilFiscal ?? null,
      })
      setFacturas((facturasRes.data ?? []) as Factura[])
      setLoading(false)
    }
    fetchData()
  }, [getSupabase, perfilActivoId, personas, currentYear])

  const ingresos = facturas.filter(f => f.tipo === 'ingreso')
  const gastos = facturas.filter(f => f.tipo === 'gasto')
  const totalIngresos = ingresos.reduce((s, f) => s + f.total, 0)
  const totalGastos = gastos.reduce((s, f) => s + f.total, 0)
  const ivaRepercutido = ingresos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const ivaSoportado = gastos.reduce((s, f) => s + Math.round(f.baseImponible * (f.iva / 100)), 0)
  const ivaNeto = ivaRepercutido - ivaSoportado
  const beneficio = totalIngresos - totalGastos

  const perfilFiscalKey = (perfil?.perfilFiscal ?? 'autonomo') as keyof typeof GUIAS_PERFIL
  const guia: GuiaPerfil =
    GUIAS_PERFIL[perfilFiscalKey] ??
    GUIAS_PERFIL.autonomo ??
    { titulo: 'Autónomo / Freelance', descripcion: '', obligaciones: [], consejos: [], modelosRelevantes: [] }

  const calendario = getCalendarioFiscal(currentYear)
  const plazos = proximosPlazos(
    calendario.map(f => ({ modeloNumero: f.modelo, periodo: f.descripcion, fechaLimiteReferencia: f.fechaLimite })),
    new Date(),
    45,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-heading font-bold tracking-tight">
                {perfil?.nombre || (hayGestion ? 'Persona gestionada' : 'Mi expediente')}
              </h1>
              {hayGestion && (
                <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                  Gestionando otra persona
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {perfil?.nif ? `NIF ${perfil.nif} · ` : ''}
              {perfil?.comunidadFiscal ? `${perfil.comunidadFiscal} · ` : ''}
              {guia.titulo} · Expediente fiscal {currentYear}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/gestoria/facturas/nueva">
            <Button size="sm">
              <FileText className="mr-1.5 h-4 w-4" /> Nueva factura
            </Button>
          </Link>
          <Link href="/fiscal">
            <Button variant="outline" size="sm">
              <Calculator className="mr-1.5 h-4 w-4" /> Calculadoras
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando expediente...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos {currentYear}</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatMoney(totalIngresos)}</div>
                <p className="text-xs text-muted-foreground">{ingresos.length} facturas emitidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos {currentYear}</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatMoney(totalGastos)}</div>
                <p className="text-xs text-muted-foreground">{gastos.length} facturas recibidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IVA neto</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${ivaNeto >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatMoney(Math.abs(ivaNeto))}
                </div>
                <p className="text-xs text-muted-foreground">{ivaNeto >= 0 ? 'A ingresar (303)' : 'A compensar'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Beneficio neto</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${beneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(beneficio)}
                </div>
                <p className="text-xs text-muted-foreground">Ingresos − gastos</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                  <CardTitle className="text-lg">Obligaciones ({guia.titulo})</CardTitle>
                </div>
                <CardDescription>Modelos que este perfil debe presentar</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {guia.obligaciones.slice(0, 8).map(o => (
                    <li key={o} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Modelos relevantes</p>
                  <div className="flex flex-wrap gap-2">
                    {guia.modelosRelevantes.map(m => {
                      const numero = m.replace('Modelo ', '')
                      return (
                        <Link key={m} href={`/fiscal?seccion=modelo${numero}`}>
                          <Button variant="outline" size="sm">{m}</Button>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <CardTitle className="text-lg">Próximos vencimientos</CardTitle>
                  </div>
                  <Link href="/fiscal">
                    <Button variant="ghost" size="sm">Calendario <ArrowRight className="ml-1 h-3 w-3" /></Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {plazos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay vencimientos en los próximos 45 días.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {plazos.slice(0, 6).map(p => (
                      <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">
                            Modelo {p.modeloNumero?.replace(/^MOD/, '') ?? '—'} · {p.periodo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.fechaLimiteReferencia.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                            p.diasRestantes <= 7
                              ? 'bg-destructive/10 text-destructive'
                              : p.diasRestantes <= 15
                                ? 'bg-yellow-500/10 text-yellow-700'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {p.diasRestantes} días
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <CardTitle className="text-lg">Facturas de {currentYear}</CardTitle>
                </div>
                <Link href="/gestoria/facturas">
                  <Button variant="ghost" size="sm">Ver todas <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {facturas.length === 0 ? (
                <div className="text-center py-6">
                  <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sin facturas registradas en {currentYear} para este perfil.
                  </p>
                  <Link href="/gestoria/facturas/nueva">
                    <Button variant="outline" size="sm" className="mt-3">
                      <FileText className="mr-1 h-3 w-3" /> Añadir factura
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Nº</th>
                        <th className="px-3 py-2 text-left">Contraparte</th>
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-right">Base</th>
                        <th className="px-3 py-2 text-right">IVA</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.slice(0, 12).map(f => (
                        <tr key={f.id} className="border-t">
                          <td className="px-3 py-2 font-medium">{f.numero}</td>
                          <td className="px-3 py-2">{f.emisorReceptor}</td>
                          <td className="px-3 py-2 text-muted-foreground">{fechaISO(f)}</td>
                          <td className="px-3 py-2 text-right">{formatMoney(f.baseImponible)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{f.iva}%</td>
                          <td className={`px-3 py-2 text-right font-medium ${f.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            {f.tipo === 'ingreso' ? '+' : '-'}{formatMoney(f.total)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{f.estado}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
