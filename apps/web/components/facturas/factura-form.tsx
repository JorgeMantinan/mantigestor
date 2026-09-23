'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CategoriaGastoPicker } from '@/components/facturas/categoria-gasto-picker'
import { VoiceInput } from '@/components/facturas/voice-input'
import { SelectorMoneda } from '@/components/selector-moneda'
import { TAGS_PREDEFINIDOS, obtenerColorTag, parsearTags, obtenerNombreTag } from '@/lib/tags'
import { MOEDAS, formatoMoneda, obtenerTasaCambio } from '@/lib/divisas'
import { useLanguage } from '@/contexts/language-context'

interface FacturaFormProps {
  formRef?: React.RefObject<HTMLFormElement | null>
  factura: {
    id: string
    numero: string
    tipo: string
    emisorReceptor: string
    nifContraparte: string | null
    fechaEmision: string
    fechaVencimiento: string | null
    baseImponible: number
    iva: number
    total: number
    categoriaGasto: string | null
    moneda?: string
    tipoCambio?: number
    descuentoPorcentaje?: number
  }
  categoriaGasto: string | null
  onCategoriaGastoChange: (v: string | null) => void
  monedaEdit: string
  onMonedaChange: (v: string) => void
  tipoCambioEdit: number
  onTipoCambioChange: (v: number) => void
  cargandoTasaEdit: boolean
  descuentoPorcentajeEdit: number
  onDescuentoChange: (v: number) => void
  notas: string
  onNotasChange: (v: string) => void
  tagsSeleccionados: string[]
  onTagsChange: (v: string[]) => void
  mostrarTagsDropdown: boolean
  onToggleTagsDropdown: () => void
  tagsDropdownRef: React.RefObject<HTMLDivElement>
  nuevoTagCustom: string
  onNuevoTagCustomChange: (v: string) => void
  onAddCustomTag: () => void
  speech: ReturnType<typeof import('@/hooks/use-speech-recognition').useSpeechRecognition>
  parseandoVoz: boolean
  onParsearVoz: () => void
  onSave: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  saving: boolean
}

export function FacturaForm({
  formRef: formRefProp,
  factura,
  categoriaGasto,
  onCategoriaGastoChange,
  monedaEdit,
  onMonedaChange,
  tipoCambioEdit,
  onTipoCambioChange,
  cargandoTasaEdit,
  descuentoPorcentajeEdit,
  onDescuentoChange,
  notas,
  onNotasChange,
  tagsSeleccionados,
  onTagsChange,
  mostrarTagsDropdown,
  onToggleTagsDropdown,
  tagsDropdownRef,
  nuevoTagCustom,
  onNuevoTagCustomChange,
  onAddCustomTag,
  speech,
  parseandoVoz,
  onParsearVoz,
  onSave,
  onCancel,
  saving,
}: FacturaFormProps) {
  const { t } = useLanguage()
  const internalFormRef = useRef<HTMLFormElement>(null)
  const formRef = formRefProp ?? internalFormRef

  return (
    <form ref={formRef as React.RefObject<HTMLFormElement>} onSubmit={onSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo">{t('facturaDetalle.tipo')}</Label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={factura.tipo}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="ingreso">{t('facturaDetalle.tipoIngreso')}</option>
            <option value="gasto">{t('facturaDetalle.tipoGasto')}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="numero">{t('facturaDetalle.numeroFactura')}</Label>
          <Input id="numero" name="numero" defaultValue={factura.numero} required />
        </div>
      </div>
      {factura.tipo === 'gasto' && (
        <div className="space-y-2">
          <Label>{t('facturaDetalle.categoriaGasto')}</Label>
          <input type="hidden" name="categoriaGasto" value={categoriaGasto ?? ''} />
          <CategoriaGastoPicker value={categoriaGasto} onChange={onCategoriaGastoChange} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="moneda-edit">{t('facturaDetalle.moneda')}</Label>
        <SelectorMoneda
          id="moneda-edit"
          value={monedaEdit}
          onChange={async (nuevaMoneda) => {
            onMonedaChange(nuevaMoneda)
            if (nuevaMoneda === 'EUR') {
              onTipoCambioChange(1)
              return
            }
            const tasa = await obtenerTasaCambio(nuevaMoneda, 'EUR')
            onTipoCambioChange(tasa)
          }}
        />
      </div>
      {monedaEdit !== 'EUR' && (
        <div className="space-y-2">
          <Label htmlFor="tipoCambio-edit">{t('facturaDetalle.tipoCambio')} ({monedaEdit} → EUR)</Label>
          <Input
            id="tipoCambio-edit"
            type="number"
            step="0.0001"
            value={tipoCambioEdit}
            onChange={(e) => onTipoCambioChange(parseFloat(e.target.value) || 1)}
            disabled={cargandoTasaEdit}
          />
          {cargandoTasaEdit && <p className="text-xs text-muted-foreground">{t('facturaDetalle.cargandoTasa')}</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="emisorReceptor">{t('facturaDetalle.contraparte')}</Label>
          <Input id="emisorReceptor" name="emisorReceptor" defaultValue={factura.emisorReceptor} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nifContraparte">{t('facturaDetalle.nifCif')}</Label>
          <Input id="nifContraparte" name="nifContraparte" defaultValue={factura.nifContraparte ?? ''} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fechaEmision">{t('facturaDetalle.fechaEmision')}</Label>
          <Input id="fechaEmision" name="fechaEmision" type="date" defaultValue={factura.fechaEmision?.split('T')[0]} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaVencimiento">{t('facturaDetalle.fechaVencimiento')}</Label>
          <Input id="fechaVencimiento" name="fechaVencimiento" type="date" defaultValue={factura.fechaVencimiento?.split('T')[0] ?? ''} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="baseImponible">{t('facturaDetalle.baseImponible')} ({MOEDAS.find(m => m.code === monedaEdit)?.symbol ?? '€'})</Label>
          <Input id="baseImponible" name="baseImponible" type="number" step="0.01" defaultValue={(factura.baseImponible / 100).toFixed(2)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="iva">{t('facturaDetalle.ivaPorcentaje')}</Label>
          <select
            id="iva"
            name="iva"
            defaultValue={factura.iva}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {[21, 10, 4, 0].map((t) => (
              <option key={t} value={t}>{t}%</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="total">{t('facturaDetalle.total')} ({MOEDAS.find(m => m.code === monedaEdit)?.symbol ?? '€'})</Label>
          <Input id="total" disabled value={(factura.total / 100).toFixed(2)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="descuentoPorcentaje">{t('facturaDetalle.descuentoPorcentaje')}</Label>
          <Input
            id="descuentoPorcentaje"
            name="descuentoPorcentaje"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={descuentoPorcentajeEdit}
            onChange={(e) => onDescuentoChange(parseFloat(e.target.value) || 0)}
          />
        </div>
        {descuentoPorcentajeEdit > 0 && (
          <div className="space-y-2">
            <Label>{t('facturaDetalle.importeDescuento')} ({MOEDAS.find(m => m.code === monedaEdit)?.symbol ?? '€'})</Label>
            <Input
              disabled
              value={`-${formatoMoneda((factura.baseImponible * descuentoPorcentajeEdit / 100) / 100, monedaEdit)}`}
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notas">{t('facturaDetalle.notasInternas')}</Label>
        <textarea
          id="notas"
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          placeholder={t('facturaDetalle.placeholderNotas')}
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('facturaDetalle.etiquetas')}</Label>
        <div className="relative" ref={tagsDropdownRef}>
          <button
            type="button"
            onClick={onToggleTagsDropdown}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className={tagsSeleccionados.length === 0 ? 'text-muted-foreground' : ''}>
              {tagsSeleccionados.length === 0 ? t('facturaDetalle.seleccionarEtiquetas') : `${tagsSeleccionados.length} ${t('facturaDetalle.etiquetasCount')}`}
            </span>
            <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {mostrarTagsDropdown && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
              <div className="max-h-60 overflow-y-auto space-y-1">
                {TAGS_PREDEFINIDOS.map(tag => (
                  <label key={tag.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      checked={tagsSeleccionados.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onTagsChange([...tagsSeleccionados, tag.id])
                        } else {
                          onTagsChange(tagsSeleccionados.filter(t => t !== tag.id))
                        }
                      }}
                    />
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.nombre}
                  </label>
                ))}
              </div>
              <div className="mt-2 border-t pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('facturaDetalle.etiquetaPersonalizada')}
                    value={nuevoTagCustom}
                    onChange={(e) => onNuevoTagCustomChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onAddCustomTag()
                      }
                    }}
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddCustomTag}
                  >
                    {t('facturaDetalle.annadir')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {tagsSeleccionados.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tagsSeleccionados.map(tagId => (
              <span
                key={tagId}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: obtenerColorTag(tagId) }}
              >
                {obtenerNombreTag(tagId)}
                <button
                  type="button"
                  onClick={() => onTagsChange(tagsSeleccionados.filter(t => t !== tagId))}
                  className="ml-0.5 rounded-full hover:bg-white/20 h-3.5 w-3.5 flex items-center justify-center"
                  aria-label={`Quitar ${obtenerNombreTag(tagId)}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-4 pt-4">
        <Button variant="outline" type="button" onClick={onCancel} className="flex-1">
          {t('facturaDetalle.cancelar')}
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? t('facturaDetalle.guardando') : t('facturaDetalle.guardarCambios')}
        </Button>
      </div>

      {speech.soportado && (
        <div className="rounded-md border p-3">
          <VoiceInput
            speech={speech}
            parseandoVoz={parseandoVoz}
            onParsear={onParsearVoz}
            compact
          />
        </div>
      )}
    </form>
  )
}
