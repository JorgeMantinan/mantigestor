'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Mail, Download, Pencil, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { VistaPreviaPlantilla } from '@/components/vista-previa-plantilla'
import { NOMBRES_PLANTILLAS, type PlantillaFactura } from '@/lib/factura-cliente-pdf'
import { useLanguage } from '@/contexts/language-context'

interface FacturaHeaderProps {
  facturaNumero: string
  facturaTipo: string
  fechaEmision: string
  plantilla: PlantillaFactura
  onPlantillaChange: (p: PlantillaFactura) => void
  onEmailOpen: () => void
  onPdfDownload: () => void
  onXmlDownload: () => void
  onEditToggle: () => void
  onDelete: () => void
  guardandoEliminacion?: boolean
  vistaPreviaDatos: {
    numero: string
    emisorReceptor: string
    nifContraparte: string | null
    fechaEmision: string
    baseImponible: number
    iva: number
    total: number
    tipo: string
    empresaNombre?: string
    empresaDireccion?: string
    empresaNif?: string
    notas?: string | null
    descuentoPorcentaje?: number
    logoBase64?: string
  }
}

export function FacturaHeader({
  facturaNumero,
  facturaTipo,
  fechaEmision,
  plantilla,
  onPlantillaChange,
  onEmailOpen,
  onPdfDownload,
  onXmlDownload,
  onEditToggle,
  onDelete,
  guardandoEliminacion,
  vistaPreviaDatos,
}: FacturaHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/gestoria/facturas">
          <Button variant="ghost" size="icon" aria-label={t('facturaDetalle.volverFacturas')}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            {t('facturaDetalle.factura')} {facturaNumero}
          </h1>
          <p className="text-sm text-muted-foreground">
            {facturaTipo === 'ingreso' ? t('facturaDetalle.emitida') : t('facturaDetalle.recibida')} —{' '}
            {new Date(fechaEmision).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <VistaPreviaPlantilla datos={vistaPreviaDatos} />
        <select value={plantilla} onChange={(e) => onPlantillaChange(e.target.value as PlantillaFactura)} className="h-8 rounded border border-input bg-background px-2 text-xs">
          {(Object.entries(NOMBRES_PLANTILLAS) as Array<[PlantillaFactura, string]>).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={onEmailOpen}>
          <Mail className="mr-2 h-4 w-4" />
          {t('facturaDetalle.enviarPorEmail')}
        </Button>
        <Button variant="outline" size="sm" onClick={onPdfDownload}>
          <Download className="mr-2 h-4 w-4" />
          {t('facturaDetalle.descargarPdf')}
        </Button>
        <Button variant="outline" size="sm" onClick={onXmlDownload}>
          <Download className="mr-2 h-4 w-4" />
          {t('facturaDetalle.descargarXml')}
        </Button>
        <Button variant="outline" size="sm" onClick={onEditToggle}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('facturaDetalle.editar')}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={guardandoEliminacion}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('facturaDetalle.eliminar')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('facturaDetalle.eliminarTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('facturaDetalle.eliminarDesc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('facturaDetalle.cancelar')}</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>{t('facturaDetalle.eliminar')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
