'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePersonaActiva } from '@/contexts/persona-activa-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Download, Calendar, Receipt, TrendingUp, TrendingDown,
  PiggyBank, Building2, CheckCircle2, Circle
} from 'lucide-react'
import Link from 'next/link'
import { calcularPackAnual, packAnualCsv, type PackAnualResult } from '@mantigestor/utils'

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

interface Perfil {
  nombre: string | null
  nif: string | null
  comunidadFiscal: string | null
  perfilFiscal: string | null
}

interface FacturaRow {
  tipo: string
  baseImponible: number
  iva: number
  total: number
  fechaEmision: string
}

export function PackAnualPageClient() {
  const { perfilActivoId } = usePersonaActiva()
  const [pack, setPack] = useState<PackAnualResult | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [anyo, setAnyo] = useState(new Date().getFullYear())
  const [cargando, setCargando] = useState(true)
  const getSupabase = useCallback(() => createClient(), [])

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCargando(false); return }

    const perfilId = perfilActivoId ?? user.id

    const [{ data: perfilData }, facturasRes] = await Promise.all([
      supabase.from('perfiles').select('nombre, nif, comunidadFiscal, perfilFiscal').eq('id', perfilId).maybeSingle(),
      supabase
        .from('facturas')
        .select('tipo, baseImponible, iva, total, fechaEmision')
        .eq('perfilId', perfilId)
        .gte('fechaEmision', `${anyo}-01-01`)
        .lt('fechaEmision', `${anyo + 1}-01-01`)
        .limit(500),
    ])

    setPerfil(perfilData as Perfil | null)

    const facturas = ((facturasRes.data ?? []) as FacturaRow[]).map(f => ({
      tipo: f.tipo as 'ingreso' | 'gasto',
      baseImponible: f.baseImponible,
      iva: f.iva,
      total: f.total,
      fechaEmision: new Date(f.fechaEmision),
    }))

    const resultado = calcularPackAnual({
      anyo,
      nombre: perfilData?.nombre ?? 'Sin nombre',
      nif: perfilData?.nif ?? null,
      comunidadFiscal: perfilData?.comunidadFiscal ?? null,
      perfilFiscal: perfilData?.perfilFiscal ?? null,
      facturas,
    })

    setPack(resultado)
    setCargando(false)
  }, [getSupabase, perfilActivoId, anyo])

  useEffect(() => { void cargarDatos() }, [cargarDatos])

  function descargarCsv() {
    if (!pack) return
    const csv = packAnualCsv(pack)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pack-anual-${pack.cabecera.anyo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Pack anual consolidado</h1>
            <p className="text-muted-foreground">
              Resumen fiscal del ejercicio {anyo}
              {perfil?.nif ? ` · NIF ${perfil.nif}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnyo(y => y - 1)}>
            ← {anyo - 1}
          </Button>
          <span className="text-sm font-medium px-2">{anyo}</span>
          <Button variant="outline" size="sm" onClick={() => setAnyo(y => y + 1)} disabled={anyo >= new Date().getFullYear()}>
            {anyo + 1} →
          </Button>
          {pack && (
            <Button size="sm" onClick={descargarCsv}>
              <Download className="mr-1.5 h-4 w-4" /> CSV
            </Button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !pack ? (
        <p className="text-sm text-muted-foreground text-center py-6">No se pudieron cargar los datos.</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatMoney(pack.resumenFacturas.ingresos)}</div>
                <p className="text-xs text-muted-foreground">{pack.resumenFacturas.totalEmitidas} facturas emitidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatMoney(pack.resumenFacturas.gastos)}</div>
                <p className="text-xs text-muted-foreground">{pack.resumenFacturas.totalRecibidas} facturas recibidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">IVA neto anual</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${pack.iva.netoAnual >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatMoney(Math.abs(pack.iva.netoAnual))}
                </div>
                <p className="text-xs text-muted-foreground">{pack.iva.netoAnual >= 0 ? 'A ingresar' : 'A compensar'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Beneficio neto</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${pack.resumenFacturas.beneficioNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(pack.resumenFacturas.beneficioNeto)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pago fraccionado estimado: {formatMoney(pack.irpf.pagoFraccionadoEstimado)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* IVA por trimestre */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Desglose IVA por trimestre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Trimestre</th>
                      <th className="px-3 py-2 text-right">Ingresos</th>
                      <th className="px-3 py-2 text-right">Gastos</th>
                      <th className="px-3 py-2 text-right">IVA Repercutido</th>
                      <th className="px-3 py-2 text-right">IVA Soportado</th>
                      <th className="px-3 py-2 text-right">IVA Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pack.iva.porTrimestre.map(t => (
                      <tr key={t.trimestre} className="border-t">
                        <td className="px-3 py-2 font-medium">T{t.trimestre}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatMoney(t.ingresos)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatMoney(t.gastos)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(t.ivaRepercutido)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(t.ivaSoportado)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${t.ivaNeto >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatMoney(t.ivaNeto)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/50 font-medium">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatMoney(pack.iva.porTrimestre.reduce((s, t) => s + t.ingresos, 0))}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatMoney(pack.iva.porTrimestre.reduce((s, t) => s + t.gastos, 0))}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(pack.iva.totalRepercutido)}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(pack.iva.totalSoportado)}</td>
                      <td className={`px-3 py-2 text-right ${pack.iva.netoAnual >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatMoney(pack.iva.netoAnual)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Checklist modelos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Modelos del ejercicio</CardTitle>
                  <CardDescription>Checklist de obligaciones fiscales del {anyo}</CardDescription>
                </div>
                <Link href="/fiscal">
                  <Button variant="outline" size="sm">Calculadoras</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pack.modelos.map(m => (
                  <li key={m.modelo} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {m.presentado ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Modelo {m.modelo}</p>
                        <p className="text-xs text-muted-foreground">{m.descripcion}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.obligatorio && (
                        <Badge variant="secondary" className="text-xs">Obligatorio</Badge>
                      )}
                      <Link href={`/fiscal?seccion=modelo${m.modelo}`}>
                        <Button variant="ghost" size="sm">Abrir</Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
