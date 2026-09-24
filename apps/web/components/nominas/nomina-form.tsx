'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/upload/FileUpload'
import { calcularNomina } from '@mantigestor/utils'
import { useLanguage } from '@/contexts/language-context'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Props {
  rolDefecto: 'jefe' | 'empleado'
  anyoFiltro: number
  userId: string | null
  perfilId?: string
  guardando: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onUploadComplete: (url: string) => void
}

export function NominaForm({ rolDefecto, anyoFiltro, userId, perfilId, guardando, onSubmit, onCancel, onUploadComplete }: Props) {
  const [calcularAuto, setCalcularAuto] = useState(false)
  const [preview, setPreview] = useState<ReturnType<typeof calcularNomina> | null>(null)
  const { t } = useLanguage()

  const calcularPreview = () => {
    const form = document.getElementById('nomina-form') as HTMLFormElement
    if (!form) return
    const fd = new FormData(form)
    const bruto = parseFloat(fd.get('salarioBruto') as string) || 0
    const hijos = parseInt(fd.get('hijos') as string) || 0
    const discapacidad = parseInt(fd.get('discapacidad') as string) || 0

    if (bruto > 0) {
      const resultado = calcularNomina({
        salarioBrutoMensual: bruto,
        hijos,
        discapacidadPct: discapacidad,
      })
      setPreview(resultado)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('nominaForm.nuevaNomina')}</CardTitle>
        <CardDescription>
          {rolDefecto === 'jefe'
            ? t('nominaForm.descripcionJefe')
            : t('nominaForm.descripcionEmpleada')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="nomina-form" onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="rol" value={rolDefecto} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="empleada">{t('nominaForm.nombreEmpleada')}</Label>
              <Input id="empleada" name="empleada" required placeholder={t('nominaForm.placeholderNombre')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mes">{t('nominaForm.mes')}</Label>
              <select
                id="mes"
                name="mes"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {MESES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="anyoForm">{t('nominaForm.anyo')}</Label>
              <Input id="anyoForm" name="anyo" type="number" min="2020" max="2030" defaultValue={anyoFiltro} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salarioBruto">{t('nominaForm.salarioBruto')}</Label>
              <Input id="salarioBruto" name="salarioBruto" type="number" step="0.01" required placeholder="1200.00" onChange={() => calcularAuto && calcularPreview()} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="irpf">{t('nominaForm.retencionIrpf')}</Label>
              <Input id="irpf" name="irpf" type="number" step="0.1" required placeholder="2" defaultValue={preview?.tipoIRPF.toFixed(1) ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seguridadSocial">{t('nominaForm.segSocial')}</Label>
              <Input id="seguridadSocial" name="seguridadSocial" type="number" step="0.01" required placeholder="50.00" defaultValue={preview?.seguridadSocial.toFixed(2) ?? ''} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="hijos">{t('nominaForm.hijos')}</Label>
              <Input id="hijos" name="hijos" type="number" min="0" max="20" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discapacidad">{t('nominaForm.discapacidad')}</Label>
              <Input id="discapacidad" name="discapacidad" type="number" min="0" max="100" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pagaExtra">{t('nominaForm.pagasExtra')}</Label>
              <select
                id="pagaExtra"
                name="pagasExtra"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="0">{t('nominaForm.sinPagasExtra')}</option>
                <option value="1">{t('nominaForm.pagaExtra1')}</option>
                <option value="2">{t('nominaForm.pagaExtra2')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="calcularAuto"
              checked={calcularAuto}
              onChange={(e) => {
                setCalcularAuto(e.target.checked)
                if (e.target.checked) calcularPreview()
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="calcularAuto" className="text-sm">{t('nominaForm.calcularAuto')}</Label>
            {calcularAuto && (
              <Button type="button" variant="outline" size="sm" onClick={calcularPreview}>
                {t('nominaForm.recalcular')}
              </Button>
            )}
          </div>

          {preview && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">{t('nominaForm.vistaPrevial')}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">{t('nominaForm.irpf')}</span>
                <span>{preview.tipoIRPF}% ({preview.retencionIRPF.toFixed(2)} €/mes)</span>
                <span className="text-muted-foreground">{t('nominaForm.segSocialLabel')}</span>
                <span>{preview.seguridadSocial.toFixed(2)} €/mes</span>
                <span className="text-muted-foreground">{t('nominaForm.netoMensual')}</span>
                <span className="font-medium">{preview.salarioNetoMensual.toFixed(2)} €</span>
                {preview.pagaExtraBruto > 0 && (
                  <>
                    <span className="text-muted-foreground">{t('nominaForm.pagaExtraLabel')}</span>
                    <span>{preview.pagaExtraBruto.toFixed(2)} € {t('nominaForm.bruto')}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <FileUpload
            bucket="documentos"
            path={perfilId ?? userId ?? ''}
            tipo="nomina"
            perfilId={perfilId ?? undefined}
            accept=".pdf"
            buttonText={t('nominaForm.subirPdf')}
            onUploadComplete={onUploadComplete}
          />
          <div className="flex gap-4 pt-2">
            <Button type="submit" className="flex-1" disabled={guardando}>
              {guardando ? t('nominaForm.guardando') : t('nominaForm.guardarNomina')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              {t('nominaForm.cancelar')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
