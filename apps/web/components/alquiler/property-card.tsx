'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, User, Trash2, Pencil, Plus } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

const CATEGORIAS_GASTO = [
  { value: 'hipoteca', label: 'Hipoteca' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'ibi', label: 'IBI' },
  { value: 'derrama', label: 'Derrama' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'otros', label: 'Otros' },
] as const

interface Gasto {
  id: string
  concepto: string
  descripcion: string | null
  importe: number
  fecha: string
}

interface Propiedad {
  id: string
  direccion: string
  ingresos: number
  inquilinoNombre: string | null
  inquilinoEmail: string | null
  inquilinoTelefono: string | null
  fechaInicioContrato: string | null
  duracionContratoMeses: number | null
  proximaRevision: string | null
  gastos: Gasto[]
}

interface Props {
  propiedad: Propiedad
  editingId: string | null
  gastoPropiedadId: string | null
  guardando: boolean
  soloLectura?: boolean
  onEdit: (id: string, e: React.FormEvent<HTMLFormElement>) => void
  onDelete: (id: string) => void
  onAddGasto: (propiedadId: string, e: React.FormEvent<HTMLFormElement>) => void
  onDeleteGasto: (propiedadId: string, gastoId: string) => void
  setEditingId: (id: string | null) => void
  setGastoPropiedadId: (id: string | null) => void
}

export const PropertyCard = memo(function PropertyCard({
  propiedad: p,
  editingId,
  gastoPropiedadId,
  guardando,
  soloLectura = false,
  onEdit,
  onDelete,
  onAddGasto,
  onDeleteGasto,
  setEditingId,
  setGastoPropiedadId,
}: Props) {
  const totalGasto = p.gastos.reduce((s, g) => s + g.importe, 0)
  const balance = p.ingresos - totalGasto
  const { t } = useLanguage()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Building2 className="mt-1 h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <CardTitle className="text-lg">{p.direccion}</CardTitle>
              <CardDescription>{t('propertyCard.propiedadAlquiler')}</CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            {!soloLectura && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setEditingId(editingId === p.id ? null : p.id)} aria-label={t('propertyCard.editarPropiedad')}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t('propertyCard.eliminarPropiedad')}>
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('propertyCard.eliminarPropiedadTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('propertyCard.eliminarPropiedadDesc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('propertyCard.cancelar')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(p.id)}>{t('propertyCard.eliminarPropiedad').split(' ')[0]}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{t('propertyCard.ingresoMensual')}</span>
            <p className="text-lg font-medium text-green-600">{(p.ingresos / 100).toFixed(2)} €</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('propertyCard.gastosTotales')}</span>
            <p className="text-lg font-medium text-red-600">{(totalGasto / 100).toFixed(2)} €</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('propertyCard.balanceMensual')}</span>
            <p className={`text-lg font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(balance / 100).toFixed(2)} €
            </p>
          </div>
        </div>

        {p.inquilinoNombre && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" aria-hidden="true" />
            <span>{p.inquilinoNombre}</span>
            {p.inquilinoEmail && <span>· {p.inquilinoEmail}</span>}
            {p.inquilinoTelefono && <span>· {p.inquilinoTelefono}</span>}
          </div>
        )}

        {(p.fechaInicioContrato || p.duracionContratoMeses || p.proximaRevision) && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-3">
            {p.fechaInicioContrato && <span>{t('propertyCard.inicioContrato')} {new Date(p.fechaInicioContrato).toLocaleDateString('es-ES')}</span>}
            {p.duracionContratoMeses && <span>{t('propertyCard.duracion')} {p.duracionContratoMeses} {t('propertyCard.meses')}</span>}
            {p.proximaRevision && <span>{t('propertyCard.proximaRevision')} {new Date(p.proximaRevision).toLocaleDateString('es-ES')}</span>}
          </div>
        )}

        {editingId === p.id && (
          <form onSubmit={(e) => { e.preventDefault(); onEdit(p.id, e) }} className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">{t('propertyCard.editarPropiedad')}</p>
            <div className="space-y-2">
              <Label htmlFor="edit-ingresos">{t('propertyCard.editIngreso')}</Label>
              <Input id="edit-ingresos" name="ingresos" type="number" step="0.01" min="0"
                defaultValue={p.ingresos / 100} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-inquilinoNombre">{t('propertyCard.editNombreInquilino')}</Label>
                <Input id="edit-inquilinoNombre" name="inquilinoNombre" defaultValue={p.inquilinoNombre ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-inquilinoEmail">Email</Label>
                <Input id="edit-inquilinoEmail" name="inquilinoEmail" defaultValue={p.inquilinoEmail ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-inquilinoTelefono">{t('propertyCard.editTelefono')}</Label>
                <Input id="edit-inquilinoTelefono" name="inquilinoTelefono" defaultValue={p.inquilinoTelefono ?? ''} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-fechaInicio">{t('propertyCard.editInicioContrato')}</Label>
                <Input id="edit-fechaInicio" name="fechaInicioContrato" type="date" defaultValue={p.fechaInicioContrato?.slice(0, 10) ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-duracion">{t('propertyCard.editDuracion')}</Label>
                <Input id="edit-duracion" name="duracionContratoMeses" type="number" min="1" defaultValue={p.duracionContratoMeses ?? ''} placeholder="12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-proximaRevision">{t('propertyCard.editProximaRevision')}</Label>
                <Input id="edit-proximaRevision" name="proximaRevision" type="date" defaultValue={p.proximaRevision?.slice(0, 10) ?? ''} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={guardando}>{guardando ? t('alquiler.guardando') : t('propertyCard.guardar')}</Button>
              <Button type="button" variant="outline" onClick={() => setEditingId(null)}>{t('propertyCard.cancelar')}</Button>
            </div>
          </form>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{t('propertyCard.gastos')}</p>
            {!soloLectura && (
              <Button variant="outline" size="sm" onClick={() => setGastoPropiedadId(gastoPropiedadId === p.id ? null : p.id)}>
                <Plus className="mr-1 h-3 w-3" />
                {t('propertyCard.anadirGasto')}
              </Button>
            )}
          </div>

          {gastoPropiedadId === p.id && (
            <form onSubmit={(e) => { e.preventDefault(); onAddGasto(p.id, e) }} className="mb-4 grid gap-4 rounded-lg border p-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="concepto">{t('propertyCard.concepto')}</Label>
                <select id="concepto" name="concepto" required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">{t('propertyCard.seleccionar')}</option>
                  {CATEGORIAS_GASTO.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="importe">{t('propertyCard.importe')}</Label>
                <Input id="importe" name="importe" type="number" step="0.01" min="0" required placeholder="0" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="descripcion">{t('propertyCard.descripcionOpcional')}</Label>
                <Input id="descripcion" name="descripcion" placeholder="Recibo comunidad enero 2026" />
              </div>
              <div className="flex items-end gap-2 sm:col-span-4">
                <Button type="submit" disabled={guardando}>{guardando ? t('alquiler.guardando') : t('propertyCard.anadir')}</Button>
                <Button type="button" variant="outline" onClick={() => setGastoPropiedadId(null)}>{t('propertyCard.cancelar')}</Button>
              </div>
            </form>
          )}

          {p.gastos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('propertyCard.sinGastos')}</p>
          ) : (
            <div className="space-y-1">
              {p.gastos.map((g) => {
                const categoria = CATEGORIAS_GASTO.find((c) => c.value === g.concepto)
                return (
                  <div key={g.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{categoria?.label ?? g.concepto}</span>
                      {g.descripcion && <span className="text-muted-foreground">· {g.descripcion}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-600">-{(g.importe / 100).toFixed(2)} €</span>
                      {!soloLectura && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={t('propertyCard.eliminarGasto')}>
                              <Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('propertyCard.eliminarGastoTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('propertyCard.eliminarGastoDesc')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('propertyCard.cancelar')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteGasto(p.id, g.id)}>{t('propertyCard.eliminarPropiedad').split(' ')[0]}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
