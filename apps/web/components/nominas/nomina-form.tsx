'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/upload/FileUpload'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Props {
  rolDefecto: 'jefe' | 'empleado'
  anyoFiltro: number
  userId: string | null
  guardando: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onUploadComplete: (url: string) => void
}

export function NominaForm({ rolDefecto, anyoFiltro, userId, guardando, onSubmit, onCancel, onUploadComplete }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva nómina</CardTitle>
        <CardDescription>
          {rolDefecto === 'jefe'
            ? 'Como empleador: el gasto es deducible en tu Modelo 130'
            : 'Como empleada: las retenciones IRPF se descuentan de tu declaración anual'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="rol" value={rolDefecto} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="empleada">Nombre de la empleada</Label>
              <Input id="empleada" name="empleada" required placeholder="Nombre completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mes">Mes</Label>
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
              <Label htmlFor="anyoForm">Año</Label>
              <Input id="anyoForm" name="anyo" type="number" min="2020" max="2030" defaultValue={anyoFiltro} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salarioBruto">Salario bruto mensual (€)</Label>
              <Input id="salarioBruto" name="salarioBruto" type="number" step="0.01" required placeholder="1200.00" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="irpf">Retención IRPF (%)</Label>
              <Input id="irpf" name="irpf" type="number" step="0.1" required placeholder="2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seguridadSocial">Seg. Social empleado (€)</Label>
              <Input id="seguridadSocial" name="seguridadSocial" type="number" step="0.01" required placeholder="50.00" />
            </div>
          </div>
          <FileUpload
            bucket="documentos"
            path={userId ?? ''}
            tipo="nomina"
            accept=".pdf"
            buttonText="Subir nómina PDF"
            onUploadComplete={onUploadComplete}
          />
          <div className="flex gap-4 pt-2">
            <Button type="submit" className="flex-1" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar nómina'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
