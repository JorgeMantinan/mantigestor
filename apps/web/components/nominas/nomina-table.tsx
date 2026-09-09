'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ChevronLeft, ChevronRight, Briefcase, User, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

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
  onDownloadPdf: (nomina: Nomina) => void
  soloLectura?: boolean
}

export const NominaTable = memo(function NominaTable({ paginadas, visibles, page, totalPages, ordenCampo, ordenDir, busqueda, toggleSort, setPage, onDelete, onDownloadPdf, soloLectura }: Props) {
  const { t } = useLanguage()
  const SortIcon = ({ campo }: { campo: OrdenCampo }) => {
    if (ordenCampo !== campo) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
    return ordenDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        {visibles.length} {t('nominaTable.nominaS')}
        {busqueda && ` · ${t('nominaTable.buscando')} "${busqueda}"`}
      </p>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t('nominaTable.rol')}</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('empleada')}>
                  {t('nominaTable.empleada')} <SortIcon campo="empleada" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => toggleSort('mes')}>
                  {t('nominaTable.mes')} <SortIcon campo="mes" />
                </th>
                <th className="px-4 py-3 text-right font-medium">{t('nominaTable.irpf')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('nominaTable.segSocial')}</th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('salarioBruto')}>
                  {t('nominaTable.bruto')} <SortIcon campo="salarioBruto" />
                </th>
                <th className="px-4 py-3 text-right font-medium cursor-pointer select-none" onClick={() => toggleSort('neto')}>
                  {t('nominaTable.neto')} <SortIcon campo="neto" />
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
                        <Briefcase className="h-3 w-3" aria-hidden="true" /> {t('nominaTable.jefe')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700">
                        <User className="h-3 w-3" aria-hidden="true" /> {t('nominaTable.empleado')}
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
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onDownloadPdf(n)}
                      >
                        <Download className="h-3 w-3 mr-1" /> PDF
                      </Button>
                      {!soloLectura && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                            >
                              {t('nominaTable.borrar')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('nominaTable.eliminarNominaTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('nominaTable.eliminarNominaDesc')} {n.empleada} {t('nominaTable.permanentemente')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('nominaTable.cancelar')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void onDelete(n.id)}>
                                {t('nominaTable.eliminar')}
                              </AlertDialogAction>
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
            {t('nominaTable.pagina')} {page + 1} {t('nominaTable.de')} {totalPages}
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
