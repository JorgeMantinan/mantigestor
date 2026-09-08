'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { EmailPreview } from '@/components/email-preview'
import { obtenerPlantillas, renderPlantilla, type PlantillaEmail } from '@/lib/plantillas-email'
import { useLanguage } from '@/contexts/language-context'

interface FacturaEmailPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facturaNumero: string
  emailDestino: string
  onEmailDestinoChange: (v: string) => void
  plantillaEmailId: string
  onPlantillaEmailIdChange: (v: string) => void
  asuntoEmail: string
  onAsuntoEmailChange: (v: string) => void
  cuerpoEmail: string
  onCuerpoEmailChange: (v: string) => void
  enviando: boolean
  onSend: () => void
  datosFactura: {
    numero: string
    emisorReceptor: string
    nifContraparte: string | null
    fechaEmision: string
    baseImponible: number
    iva: number
    total: number
    tipo: string
  }
  perfil: {
    nombre: string | null
    empresa_nombre: string | null
  } | null
}

export function FacturaEmailPreview({
  open,
  onOpenChange,
  facturaNumero,
  emailDestino,
  onEmailDestinoChange,
  plantillaEmailId,
  onPlantillaEmailIdChange,
  asuntoEmail,
  onAsuntoEmailChange,
  cuerpoEmail,
  onCuerpoEmailChange,
  enviando,
  onSend,
  datosFactura,
  perfil,
}: FacturaEmailPreviewProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('facturaDetalle.enviarEmailTitle')}</DialogTitle>
          <DialogDescription>
            {t('facturaDetalle.enviarEmailDesc')} {facturaNumero} {t('facturaDetalle.comoPdf')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-destino">{t('facturaDetalle.direccionEmail')}</Label>
            <Input
              id="email-destino"
              type="email"
              placeholder="ejemplo@email.com"
              value={emailDestino}
              onChange={(e) => onEmailDestinoChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-plantilla-tipo">{t('facturaDetalle.plantillaEmail')}</Label>
            <select
              id="email-plantilla-tipo"
              value={plantillaEmailId}
              onChange={(e) => {
                const id = e.target.value
                onPlantillaEmailIdChange(id)
                const plantillas = obtenerPlantillas()
                const seleccionada = plantillas.find(p => p.id === id)
                if (seleccionada && perfil) {
                  const { asunto, cuerpo } = renderPlantilla(seleccionada, datosFactura, {
                    nombre: perfil.nombre,
                    empresa_nombre: perfil.empresa_nombre,
                  })
                  onAsuntoEmailChange(asunto)
                  onCuerpoEmailChange(cuerpo)
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {obtenerPlantillas().map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          {perfil && (() => {
            const plantillas = obtenerPlantillas()
            const plantillaActual = plantillas.find(p => p.id === plantillaEmailId) ?? plantillas[0]
            if (!plantillaActual) return null
            const renderDefault = renderPlantilla(plantillaActual, datosFactura, { nombre: perfil.nombre, empresa_nombre: perfil.empresa_nombre })
            return (
              <EmailPreview
                plantilla={plantillaActual}
                asuntoRenderizado={asuntoEmail || renderDefault.asunto}
                cuerpoRenderizado={cuerpoEmail || renderDefault.cuerpo}
                onAsuntoChange={onAsuntoEmailChange}
                onCuerpoChange={onCuerpoEmailChange}
                editable
              />
            )
          })()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            {t('facturaDetalle.cancelar')}
          </Button>
          <Button onClick={onSend} disabled={!emailDestino || enviando}>
            {enviando ? t('facturaDetalle.enviando') : t('facturaDetalle.enviarEmail')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
