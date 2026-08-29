'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ChevronLeft, ChevronRight, Briefcase, User, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

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

type OrdenCampo = 'empleada' | 'mes' | 'salarioBruto' | 'neto'
type OrdenDireccion = 'asc' | 'desc'

interface Props {
  paginadas: Nomina[]
  visibles: Nomina[]
  page: number
  totalPages: number
 ordenCampo: OrdenCampo
 ordenDir: OrdenDireccion
  busqueda: string
  toggleSort: (campo: OrdenCampo) => void
  setPage: (page: number) => void
  onDelete: (id: string) => void
}

export const NominaTable = memo(function NominaTable({ paginadas, visibles, page, totalPages, ordenCampo, ordenDir, busqueda, toggleSort, setPage, onDelete }: Props) {
  const SortIcon = ({ campo }: { campo: OrdenCampo }) => {
    if (ordenCampo !== campo) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return ordenDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        {visibles.length} nómina{visibles.length !== 1 ? 's' : ''}
        {busqueda && ` · Buscando "${busqueda}"`}
      </p>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('empleada')}>
                  Empleada <SortIcon campo="empleada" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('mes')}>
                  Mes <SortIcon campo="mes" />
                </th>
                <th className="px-4 py-3 text-right font-medium">IRPF</th>
                <th className="px-4 py-3 text-right font-medium">S.Social</th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('salarioBruto')}>
                  Bruto <SortIcon campo="salarioBruto" />
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('neto')}>
                  Neto <SortIcon campo="neto" />
                </th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {paginadas.map((n) => (
                <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {n.rol === 'jefe' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <Briefcase className="h-3 w-3" aria-hidden="true" /> Jefe
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700">
                        <User className="h-3 w-3" aria-hidden="true" /> Empleada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{n.empleada}</td>
                  <td className="px-4 py-3">{MESES[n.mes - 1]} {n.anyo}</td>
                  <td className="px-4 py-3 text-right">{n.irpf}%</td>
                  <td className="px-4 py-3 text-right">{formatMoney(n.seguridadSocial)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(n.salarioBruto)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(n.neto)}</td>
                  <td className="px-4 py-3 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                          Borrar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar nómina?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará la nómina de {n.empleada} permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void onDelete(n.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  )
})
