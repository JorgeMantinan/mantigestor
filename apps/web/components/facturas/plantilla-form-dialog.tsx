'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Trash2, Plus, CircleDollarSign, CalendarDays, Wallet, Paperclip, FileText } from 'lucide-react'
import { type TriggerTipo, type Attachment, type FacturaRecurrente, parseAttachments, serializarNotasConAttachments } from './types-recurrentes'
import { useLanguage } from '@/contexts/language-context'

const TIPOS_IVA = [21, 10, 4, 0] as const

interface PlantillaFormDialogProps {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  guardando: boolean
  error: string
  onGuardar: (data: PlantillaFormData) => void
  editData?: FacturaRecurrente | null
}

export interface PlantillaFormData {
  tipo: string
  numero: string
  emisorReceptor: string
  nifContraparte: string
  baseImponible: string
  iva: string
  diaGeneracion: string
  diaEmail: string
  triggerTipo: TriggerTipo | null
  triggerValor: string
  saldoBanco: string
  attachments: Attachment[]
}

function emptyFormData(): PlantillaFormData {
  return {
    tipo: 'gasto',
    numero: '',
    emisorReceptor: '',
    nifContraparte: '',
    baseImponible: '',
    iva: '21',
    diaGeneracion: '5',
    diaEmail: '',
    triggerTipo: null,
    triggerValor: '',
    saldoBanco: '',
    attachments: [],
  }
}

function editDataToForm(p: FacturaRecurrente): PlantillaFormData {
  return {
    tipo: p.tipo,
    numero: p.numero,
    emisorReceptor: p.emisorReceptor,
    nifContraparte: p.nifContraparte ?? '',
    baseImponible: String(p.baseImponible),
    iva: String(p.iva),
    diaGeneracion: String(p.diaGeneracion),
    diaEmail: p.diaEmail != null ? String(p.diaEmail) : '',
    triggerTipo: null,
    triggerValor: '',
    saldoBanco: '',
    attachments: parseAttachments(p.notas),
  }
}

function PlantillaFormFields({
  data,
  onChange,
}: {
  data: PlantillaFormData
  onChange: (patch: Partial<PlantillaFormData>) => void
}) {
  const { t } = useLanguage()
  const [nuevoAttNombre, setNuevoAttNombre] = useState('')
  const [nuevoAttUrl, setNuevoAttUrl] = useState('')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('facturaRecurrente.tipo')}</Label>
          <select value={data.tipo} onChange={e => onChange({ tipo: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <option value="ingreso">{t('facturaRecurrente.tipoIngreso')}</option>
            <option value="gasto">{t('facturaRecurrente.tipoGasto')}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t('facturaRecurrente.numeroFacturaPrefijo')}</Label>
          <Input value={data.numero} onChange={e => onChange({ numero: e.target.value })} placeholder="F-2024-" />
          <p className="text-xs text-muted-foreground">{t('facturaRecurrente.anadirAutomaticamente')}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('facturaRecurrente.nombreProveedor')}</Label>
          <Input value={data.emisorReceptor} onChange={e => onChange({ emisorReceptor: e.target.value })} placeholder="Empresa XYZ" />
        </div>
        <div className="space-y-2">
          <Label>{t('facturaRecurrente.nifCif')}</Label>
          <Input value={data.nifContraparte} onChange={e => onChange({ nifContraparte: e.target.value })} placeholder="B12345678" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>{t('facturaRecurrente.baseImponible')}</Label>
          <Input type="number" step="0.01" value={data.baseImponible} onChange={e => onChange({ baseImponible: e.target.value })} placeholder="100.00" />
        </div>
        <div className="space-y-2">
          <Label>{t('facturaRecurrente.ivaPorcentaje')}</Label>
          <select value={data.iva} onChange={e => onChange({ iva: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {TIPOS_IVA.map(v => <option key={v} value={v}>{v}%</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t('facturaRecurrente.diaDelMes')}</Label>
          <select value={data.diaGeneracion} onChange={e => onChange({ diaGeneracion: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('facturaRecurrente.diaAvisoEmail')}</Label>
          <select value={data.diaEmail} onChange={e => onChange({ diaEmail: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <option value="">{t('facturaRecurrente.sinAviso')}</option>
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t('facturaRecurrente.emailAutomatico')}</p>
        </div>
      </div>
      <div className="space-y-3 rounded-md border p-4">
        <Label className="text-sm font-medium">{t('facturaRecurrente.triggerGeneracion')}</Label>
        <p className="text-xs text-muted-foreground">
          {t('facturaRecurrente.triggerDescripcion')}
        </p>
        <div className="space-y-2">
          {([
            { value: null, label: t('facturaRecurrente.triggerPorDia'), icon: CalendarDays, desc: t('facturaRecurrente.triggerDescDia').replace('{dia}', String(data.diaGeneracion)) },
            { value: 'umbral_gasto' as TriggerTipo, label: t('facturaRecurrente.triggerUmbralGasto'), icon: CircleDollarSign, desc: t('facturaRecurrente.triggerDescUmbral') },
            { value: 'fecha_especifica' as TriggerTipo, label: t('facturaRecurrente.triggerFechaEspecifica'), icon: CalendarDays, desc: t('facturaRecurrente.triggerDescDia').replace('{dia}', String(data.diaGeneracion)) },
            { value: 'saldo_bajo' as TriggerTipo, label: t('facturaRecurrente.triggerSaldoBajo'), icon: Wallet, desc: t('facturaRecurrente.triggerDescSaldo') },
          ] as const).map(opt => (
            <label key={opt.value ?? 'none'} className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${data.triggerTipo === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
              <input
                type="radio"
                name="triggerTipo"
                checked={data.triggerTipo === opt.value}
                onChange={() => onChange({ triggerTipo: opt.value })}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {data.triggerTipo && (
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label>{data.triggerTipo === 'fecha_especifica' ? t('facturaRecurrente.diaDelMes') : t('facturaRecurrente.umbralEuros')}</Label>
              {data.triggerTipo === 'fecha_especifica' ? (
                <select value={data.triggerValor || data.diaGeneracion} onChange={e => onChange({ triggerValor: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <Input type="number" step="0.01" value={data.triggerValor} onChange={e => onChange({ triggerValor: e.target.value })} placeholder={data.triggerTipo === 'umbral_gasto' ? '500.00' : '1000.00'} />
              )}
              <p className="text-xs text-muted-foreground">
                {data.triggerTipo === 'umbral_gasto' && t('facturaRecurrente.fechaGeneracion')}
                {data.triggerTipo === 'fecha_especifica' && t('facturaRecurrente.fechaEspecificaDesc')}
                {data.triggerTipo === 'saldo_bajo' && t('facturaRecurrente.saldoBajoDesc')}
              </p>
            </div>
            {data.triggerTipo === 'saldo_bajo' && (
              <div className="space-y-2">
                <Label>{t('facturaRecurrente.saldoActualBanco')} <span className="text-muted-foreground text-xs">{t('facturaRecurrente.manual')}</span></Label>
                <Input type="number" step="0.01" value={data.saldoBanco} onChange={e => onChange({ saldoBanco: e.target.value })} placeholder="0.00" />
                <p className="text-xs text-muted-foreground">{t('facturaRecurrente.introduceSaldo')}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-3 rounded-md border p-4">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          {t('facturaRecurrente.documentosAdjuntos')}
        </Label>
        <p className="text-xs text-muted-foreground">
          {t('facturaRecurrente.documentosAdjuntosDesc')}
        </p>
        {data.attachments.length > 0 && (
          <div className="space-y-1.5">
            {data.attachments.map((att, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium truncate">{att.nombre}</span>
                  <span className="text-muted-foreground truncate">({att.url})</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => onChange({ attachments: data.attachments.filter((_, j) => j !== i) })}
                  aria-label={`Eliminar ${att.nombre}`}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <Input
            value={nuevoAttNombre}
            onChange={e => setNuevoAttNombre(e.target.value)}
            placeholder={t('facturaRecurrente.nombreDocumento')}
          />
          <Input
            value={nuevoAttUrl}
            onChange={e => setNuevoAttUrl(e.target.value)}
            placeholder={t('facturaRecurrente.urlDocumento')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!nuevoAttNombre.trim() || !nuevoAttUrl.trim()}
            onClick={() => {
              onChange({ attachments: [...data.attachments, { nombre: nuevoAttNombre.trim(), url: nuevoAttUrl.trim() }] })
              setNuevoAttNombre('')
              setNuevoAttUrl('')
            }}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PlantillaFormDialog({
  mode,
  open,
  onOpenChange,
  guardando,
  error,
  onGuardar,
  editData,
}: PlantillaFormDialogProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState<PlantillaFormData>(emptyFormData)

  const isOpen = mode === 'create' ? open : open

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen && mode === 'edit' && editData) {
      setForm(editDataToForm(editData))
    } else if (nextOpen && mode === 'create') {
      setForm(emptyFormData())
    }
    onOpenChange(nextOpen)
  }

  const handleChange = (patch: Partial<PlantillaFormData>) => {
    setForm(prev => ({ ...prev, ...patch }))
  }

  const handleGuardar = () => {
    onGuardar(form)
  }

  if (mode === 'create') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('facturaRecurrente.nuevaFacturaRecurrente')}</CardTitle>
          <CardDescription>
            {t('facturaRecurrente.descripcionForm')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PlantillaFormFields data={form} onChange={handleChange} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('facturaRecurrente.cancelar')}</Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? t('facturaRecurrente.guardando') : t('facturaRecurrente.crearPlantilla')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('facturaRecurrente.editarPlantillaTitle')}</DialogTitle>
          <DialogDescription>
            {t('facturaRecurrente.editarPlantillaDesc').replace('{nombre}', editData?.emisorReceptor ?? '')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <PlantillaFormFields data={form} onChange={handleChange} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('facturaRecurrente.cancelar')}</Button>
          <Button onClick={handleGuardar} disabled={guardando}>
            {guardando ? t('facturaRecurrente.guardando') : t('facturaRecurrente.guardarCambios')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
