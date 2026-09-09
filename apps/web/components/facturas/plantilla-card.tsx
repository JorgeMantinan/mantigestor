'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2, Pause, Play, RefreshCw, Download, FileText, CircleDollarSign, Wallet, Paperclip, CreditCard, Pencil, Clock } from 'lucide-react'
import { VistaPreviaPlantilla } from '@/components/vista-previa-plantilla'
import { parseTriggerConfig, parseAttachments, type FacturaRecurrente, type PerfilEmpresa } from './types-recurrentes'
import { useLanguage } from '@/contexts/language-context'

interface PlantillaCardProps {
  plantilla: FacturaRecurrente
  perfil: PerfilEmpresa | null
  dragHandle: React.ReactNode
  generandoPdfId: string | null
  creandoAhoraId: string | null
  cobrandoId: string | null
  formatMoney: (cents: number) => string
  calcularProximaGeneracion: (dia: number) => Date
  onDescargarPdf: (p: FacturaRecurrente) => void
  onGenerarAhora: (p: FacturaRecurrente) => void
  onCobrarStripe: (p: FacturaRecurrente) => void
  onEditar: (p: FacturaRecurrente) => void
  onEditarAdjuntos: (p: FacturaRecurrente) => void
  onVerHistorial: (p: FacturaRecurrente) => void
  onToggleActiva: (id: string, activa: boolean) => void
  onEliminar: (id: string) => void
}

export function PlantillaCard({
  plantilla: p,
  perfil,
  dragHandle,
  generandoPdfId,
  creandoAhoraId,
  cobrandoId,
  formatMoney,
  calcularProximaGeneracion,
  onDescargarPdf,
  onGenerarAhora,
  onCobrarStripe,
  onEditar,
  onEditarAdjuntos,
  onVerHistorial,
  onToggleActiva,
  onEliminar,
}: PlantillaCardProps) {
  const { t } = useLanguage()
  const importeIva = Math.round(p.baseImponible * (p.iva / 100))
  const total = p.baseImponible + importeIva
  const ahora = new Date()
  const numeroSiguiente = `${p.numero}-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  const nombreMes = (dia: number) => t('facturaRecurrente.diaDeCadaMes').replace('{dia}', String(dia))

  return (
    <Card className={!p.activa ? 'opacity-60' : ''}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-2">
            {dragHandle}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${p.activa ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="font-medium">{p.emisorReceptor}</span>
                {p.nifContraparte && (
                  <span className="text-xs text-muted-foreground">({p.nifContraparte})</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{p.numero}-YYYY-MM</span>
                <span>·</span>
                {(() => {
                  const { triggerTipo, triggerValor } = parseTriggerConfig(p.notas)
                  if (triggerTipo === 'umbral_gasto' && triggerValor != null) {
                    return <span className="inline-flex items-center gap-1 text-amber-600"><CircleDollarSign className="h-3 w-3" /> {t('facturaRecurrente.gasto')} &gt; {formatMoney(triggerValor * 100)}</span>
                  }
                  if (triggerTipo === 'saldo_bajo' && triggerValor != null) {
                    return <span className="inline-flex items-center gap-1 text-orange-600"><Wallet className="h-3 w-3" /> {t('facturaRecurrente.saldo')} &lt; {formatMoney(triggerValor * 100)}</span>
                  }
                  return <span>{nombreMes(p.diaGeneracion)}</span>
                })()}
                {p.diaEmail && (
                  <>
                    <span>·</span>
                    <span className="text-blue-600">{t('facturaRecurrente.emailDia').replace('{dia}', String(p.diaEmail))}</span>
                  </>
                )}
                <span>·</span>
                <span className="capitalize">{p.tipo === 'ingreso' ? t('facturaRecurrente.ingreso') : t('facturaRecurrente.gasto')}</span>
              </div>
              {p.ultimaGeneracion && (
                <p className="text-xs text-muted-foreground">
                  {t('facturaRecurrente.ultimaGeneracion')}: {new Date(p.ultimaGeneracion).toLocaleDateString('es-ES')}
                </p>
              )}
              {parseAttachments(p.notas).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {parseAttachments(p.notas).map((att, i) => (
                    <Badge key={i} variant="secondary" className="text-xs gap-1">
                      <Paperclip className="h-2.5 w-2.5" aria-hidden="true" />
                      {att.nombre}
                    </Badge>
                  ))}
                </div>
              )}
              {p.activa && (
                <p className="text-xs text-muted-foreground">
                  {t('facturaRecurrente.proximaGeneracion')}: {calcularProximaGeneracion(p.diaGeneracion).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatMoney(p.baseImponible)}</span>
            <span className="text-xs text-muted-foreground">+{p.iva}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap border-t pt-3">
          <VistaPreviaPlantilla datos={{
            numero: numeroSiguiente,
            emisorReceptor: p.emisorReceptor,
            nifContraparte: p.nifContraparte,
            fechaEmision: ahora.toISOString().slice(0, 10),
            baseImponible: p.baseImponible,
            iva: p.iva,
            total,
            tipo: p.tipo,
            empresaNombre: perfil?.empresa_nombre ?? perfil?.nombre ?? undefined,
            empresaDireccion: perfil?.empresa_direccion ?? undefined,
            empresaNif: perfil?.empresa_nif ?? undefined,
            notas: perfil?.notasPie ?? null,
            logoBase64: perfil?.logoBase64 ?? undefined,
          }} />

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={generandoPdfId === p.id}
            onClick={() => onDescargarPdf(p)}
          >
            {generandoPdfId === p.id ? (
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Download className="mr-1 h-3 w-3" />
            )}
            {t('facturaRecurrente.descargarPdf')}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!p.activa || creandoAhoraId === p.id}>
                {creandoAhoraId === p.id ? (
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <FileText className="mr-1 h-3 w-3" />
                )}
                {t('facturaRecurrente.generarAhora')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('facturaRecurrente.generarFacturaAhora')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('facturaRecurrente.generarFacturaAhoraDesc').replace('{numero}', numeroSiguiente).replace('{fecha}', ahora.toLocaleDateString('es-ES')).replace('{total}', formatMoney(total)).replace('{iva}', String(p.iva))}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('facturaRecurrente.cancelar')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onGenerarAhora(p)}>
                  {t('facturaRecurrente.confirmarGeneracion')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!p.activa || cobrandoId === p.id || p.tipo !== 'ingreso'}
            onClick={() => onCobrarStripe(p)}
            title={p.tipo !== 'ingreso' ? t('facturaRecurrente.soloIngreso') : t('facturaRecurrente.cobrarConStripe')}
          >
            {cobrandoId === p.id ? (
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CreditCard className="mr-1 h-3 w-3" />
            )}
            {t('facturaRecurrente.cobrarConStripe')}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEditarAdjuntos(p)}
            aria-label={t('facturaRecurrente.editarAdjuntos')}
          >
            <Paperclip className="h-3 w-3" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEditar(p)}
            aria-label={t('facturaRecurrente.editarPlantilla')}
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onVerHistorial(p)}
            aria-label={t('facturaRecurrente.verHistorial')}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleActiva(p.id, p.activa)} aria-label={p.activa ? t('facturaRecurrente.desactivarRecurrente') : t('facturaRecurrente.activarRecurrente')}>
            {p.activa ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={t('facturaRecurrente.eliminarRecurrente')}>
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('facturaRecurrente.eliminarPlantillaTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('facturaRecurrente.eliminarPlantillaDesc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('facturaRecurrente.cancelar')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onEliminar(p.id)}>{t('facturaRecurrente.eliminar')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
