'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, AlertCircle } from 'lucide-react'

interface GastoDeducible {
  id: string
  categoria: string
  descripcion: string
  porcentajeDeducible: number
  documentacion: string
  notas?: string
}

const GASTOS_DEDUCIBLES: GastoDeducible[] = [
  { id: 'suministros-agua', categoria: 'Suministros', descripcion: 'Agua', porcentajeDeducible: 100, documentacion: 'Factura de agua' },
  { id: 'suministros-luz', categoria: 'Suministros', descripcion: 'Electricidad', porcentajeDeducible: 100, documentacion: 'Factura de luz' },
  { id: 'suministros-gas', categoria: 'Suministros', descripcion: 'Gas', porcentajeDeducible: 100, documentacion: 'Factura de gas' },
  { id: 'suministros-internet', categoria: 'Suministros', descripcion: 'Internet y telefonía', porcentajeDeducible: 100, documentacion: 'Factura de internet/teléfono', notas: 'Si es mixed-use, solo % profesional' },
  { id: 'alquiler-local', categoria: 'Alquiler', descripcion: 'Alquiler local / oficina', porcentajeDeducible: 100, documentacion: 'Contrato de arrendamiento + factura' },
  { id: 'alquiler-vehiculo', categoria: 'Alquiler', descripcion: 'Alquiler vehículo profesional', porcentajeDeducible: 100, documentacion: 'Contrato + factura + justificativo uso profesional' },
  { id: 'material-oficina', categoria: 'Material oficina', descripcion: 'Material de oficina (papel, tóner, etc.)', porcentajeDeducible: 100, documentacion: 'Factura de compra' },
  { id: 'material-informatico', categoria: 'Material oficina', descripcion: 'Equipamiento informático', porcentajeDeducible: 100, documentacion: 'Factura de compra', notas: 'Amortizable si > 300€' },
  { id: 'formacion-cursos', categoria: 'Formación', descripcion: 'Cursos y formación profesional', porcentajeDeducible: 100, documentacion: 'Factura + certificado asistencia' },
  { id: 'formacion-libros', categoria: 'Formación', descripcion: 'Libros y publicaciones técnicas', porcentajeDeducible: 100, documentacion: 'Factura de compra' },
  { id: 'seguros-responsabilidad', categoria: 'Seguros', descripcion: 'Seguro de responsabilidad civil', porcentajeDeducible: 100, documentacion: 'Póliza + factura' },
  { id: 'seguros-salud', categoria: 'Seguros', descripcion: 'Seguro médico privado', porcentajeDeducible: 100, documentacion: 'Póliza + recibo domiciliado', notas: 'Deducible para autónomos con empleados' },
  { id: 'profesionales-abogado', categoria: 'Profesionales', descripcion: 'Abogados y asesores legales', porcentajeDeducible: 100, documentacion: 'Factura del profesional' },
  { id: 'profesionales-contable', categoria: 'Profesionales', descripcion: 'Contable / gestoría', porcentajeDeducible: 100, documentacion: 'Factura del profesional' },
  { id: 'profesionales-perito', categoria: 'Profesionales', descripcion: 'Peritos y auditorías', porcentajeDeducible: 100, documentacion: 'Factura del profesional' },
  { id: 'dietas-comida', categoria: 'Dietas y manutención', descripcion: 'Comidas de trabajo', porcentajeDeducible: 100, documentacion: 'Ticket/factura + justificativo viaje/reunión', notas: 'Máx. 26,67€/día sin pernocta, 53,34€/con pernocta (2026)' },
  { id: 'dietas-transporte', categoria: 'Dietas y manutención', descripcion: 'Transporte en desplazamientos', porcentajeDeducible: 100, documentacion: 'Billete / factura + justificativo viaje' },
  { id: 'transporte-gasolina', categoria: 'Transporte', descripcion: 'Gasolina profesional', porcentajeDeducible: 100, documentacion: 'Ticket gasolinera + libro de gastos', notas: 'Solo gasto/% uso profesional' },
  { id: 'transporte-peaton', categoria: 'Transporte', descripcion: 'Transporte público', porcentajeDeducible: 100, documentacion: 'Billete o abono' },
  { id: 'transporte-parking', categoria: 'Transporte', descripcion: 'Parking y peajes', porcentajeDeducible: 100, documentacion: 'Ticket / factura' },
  { id: 'gastos-financieros', categoria: 'Gastos financieros', descripcion: 'Intereses de préstamos profesionales', porcentajeDeducible: 100, documentacion: 'Extracto bancario + contrato préstamo' },
  { id: 'gastos-bancarios', categoria: 'Gastos financieros', descripcion: 'Comisiones bancarias', porcentajeDeducible: 100, documentacion: 'Extracto bancario' },
]

const STORAGE_KEY = 'mantigestor_gastos_deducibles'

const CATEGORIAS = [...new Set(GASTOS_DEDUCIBLES.map(g => g.categoria))]

export default function GastosDeduciblesPage() {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [expandida, setExpandida] = useState<string | null>(null)

  const toggle = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const seleccionadosPorCategoria = useMemo(() => {
    const mapa: Record<string, GastoDeducible[]> = {}
    for (const g of GASTOS_DEDUCIBLES) {
      if (!mapa[g.categoria]) mapa[g.categoria] = []
      mapa[g.categoria]!.push(g)
    }
    return mapa
  }, [])

  const totalSeleccionados = seleccionados.size
  const gastosSeleccionados = GASTOS_DEDUCIBLES.filter(g => seleccionados.has(g.id))

  const resumenPorCategoria = useMemo(() => {
    return CATEGORIAS.map(cat => {
      const total = GASTOS_DEDUCIBLES.filter(g => g.categoria === cat).length
      const seleccionadosEnCategoria = GASTOS_DEDUCIBLES.filter(g => g.categoria === cat && seleccionados.has(g.id)).length
      return { categoria: cat, total, seleccionados: seleccionadosEnCategoria }
    })
  }, [seleccionados])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">¿Qué gastos puedo deducir?</h1>
        <p className="text-muted-foreground">Marca los gastos que aplican a tu situación para generar tu lista personalizada</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gastos seleccionados</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">{totalSeleccionados}</span>
            <span className="text-sm text-muted-foreground ml-2">de {GASTOS_DEDUCIBLES.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Documentación necesaria</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {totalSeleccionados > 0
                ? `${gastosSeleccionados.length} tipo(s) de documento necesarios`
                : 'Marca gastos para ver la documentación'}
            </p>
          </CardContent>
        </Card>
      </div>

      {CATEGORIAS.map(categoria => {
        const gastos = seleccionadosPorCategoria[categoria] ?? []
        const seleccionadosEnCategoria = gastos.filter(g => seleccionados.has(g.id)).length
        const expandidaCategoria = expandida === categoria

        return (
          <Card key={categoria}>
            <CardHeader className="pb-2">
              <button
                className="flex w-full items-center justify-between"
                onClick={() => setExpandida(expandidaCategoria ? null : categoria)}
              >
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-medium">{categoria}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {seleccionadosEnCategoria}/{gastos.length}
                  </Badge>
                </div>
                <svg
                  className={`h-4 w-4 transition-transform ${expandidaCategoria ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </CardHeader>
            {expandidaCategoria && (
              <CardContent>
                <div className="space-y-3">
                  {gastos.map(g => (
                    <div
                      key={g.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        seleccionados.has(g.id) ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={g.id}
                          checked={seleccionados.has(g.id)}
                          onCheckedChange={() => toggle(g.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={g.id} className="text-sm font-medium cursor-pointer">
                            {g.descripcion}
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {g.porcentajeDeducible}% deducible
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {g.documentacion}
                          </p>
                          {g.notas && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {g.notas}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {totalSeleccionados > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" /> Tu lista de deducciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resumenPorCategoria.filter(c => c.seleccionados > 0).map(c => (
                <div key={c.categoria}>
                  <h3 className="text-sm font-medium mb-2">{c.categoria}</h3>
                  <ul className="space-y-1">
                    {GASTOS_DEDUCIBLES.filter(g => g.categoria === c.categoria && seleccionados.has(g.id)).map(g => (
                      <li key={g.id} className="flex items-center justify-between text-sm rounded bg-muted/50 px-3 py-1.5">
                        <span>{g.descripcion}</span>
                        <span className="text-xs text-muted-foreground">{g.documentacion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Consejo:</strong> Guarda todas las facturas y tickets. La Agencia Tributaria puede solicitarlos en una inspección. Mantén una copia digital organizada por categoría.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
