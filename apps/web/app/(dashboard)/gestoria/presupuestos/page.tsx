'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, TrendingUp, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'
import { type Presupuesto, obtenerPresupuestos, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto } from '@/lib/presupuestos'
import { CATEGORIAS_GASTO } from '@mantigestor/utils'

const formatEuro = (cents: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const CATEGORIA_OPTIONS = CATEGORIAS_GASTO.map(c => ({ id: c.id, label: c.label, color: c.color }))

export default function PresupuestosPage() {
  const { t } = useLanguage()
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [anyo, setAnyo] = useState(new Date().getFullYear())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formCategoria, setFormCategoria] = useState('')
  const [formMensual, setFormMensual] = useState('')
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  useEffect(() => {
    setPresupuestos(obtenerPresupuestos())
  }, [])

  const presupuestosAnyo = useMemo(
    () => presupuestos.filter(p => p.anyo === anyo),
    [presupuestos, anyo]
  )

  const totalMensual = useMemo(
    () => presupuestosAnyo.reduce((s, p) => s + p.amountMensual, 0),
    [presupuestosAnyo]
  )

  const totalAnual = totalMensual * 12

  const openCrear = () => {
    setEditingId(null)
    setFormCategoria('')
    setFormMensual('')
    setDialogOpen(true)
  }

  const openEditar = (p: Presupuesto) => {
    setEditingId(p.id)
    setFormCategoria(p.categoria)
    setFormMensual(String(p.amountMensual / 100))
    setDialogOpen(true)
  }

  const handleGuardar = () => {
    if (!formCategoria) {
      toast.error(t('presupuestos.seleccionaCategoria'))
      return
    }
    const mensual = parseFloat(formMensual)
    if (isNaN(mensual) || mensual <= 0) {
      toast.error(t('presupuestos.importeInvalido'))
      return
    }

    const data = {
      categoria: formCategoria,
      amountMensual: Math.round(mensual * 100),
      anyo,
    }

    if (editingId) {
      actualizarPresupuesto({ ...data, id: editingId })
      toast.success(t('presupuestos.actualizado'))
    } else {
      const duplicado = presupuestosAnyo.find(p => p.categoria === formCategoria)
      if (duplicado) {
        toast.error(t('presupuestos.categoriaDuplicada'))
        return
      }
      crearPresupuesto(data)
      toast.success(t('presupuestos.creado'))
    }

    setPresupuestos(obtenerPresupuestos())
    setDialogOpen(false)
  }

  const handleEliminar = useCallback((id: string) => {
    eliminarPresupuesto(id)
    setPresupuestos(obtenerPresupuestos())
    setEliminandoId(null)
    toast.success(t('presupuestos.eliminado'))
  }, [t])

  const anos = useMemo(() => {
    const actual = new Date().getFullYear()
    return [actual - 1, actual, actual + 1]
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('presupuestos.titulo')}</h1>
          <p className="text-muted-foreground">{t('presupuestos.subtitulo')}</p>
        </div>
        <Button onClick={openCrear}>
          <Plus className="mr-2 h-4 w-4" /> {t('presupuestos.nuevoPresupuesto')}
        </Button>
      </div>

      {/* Year selector + Summary */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">{t('presupuestos.anyo')}</Label>
          <select
            value={anyo}
            onChange={e => setAnyo(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {anos.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <Card className="flex-1 min-w-[200px]">
          <CardContent className="py-3 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t('presupuestos.totalMensual')}</p>
              <p className="text-lg font-bold">{formatEuro(totalMensual)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[200px]">
          <CardContent className="py-3 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t('presupuestos.totalAnual')}</p>
              <p className="text-lg font-bold">{formatEuro(totalAnual)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories list */}
      {presupuestosAnyo.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{t('presupuestos.sinPresupuestos')}</p>
            <p className="text-xs mt-1">{t('presupuestos.creaPrimero')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {presupuestosAnyo.map(p => {
            const cat = CATEGORIA_OPTIONS.find(c => c.id === p.categoria)
            const porcentaje = 0
            const excedido = porcentaje > 80
            return (
              <Card key={p.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat?.color ?? '#6b7280' }}
                      />
                      <span className="font-medium text-sm">{cat?.label ?? p.categoria}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditar(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setEliminandoId(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('presupuestos.mensual')}: {formatEuro(p.amountMensual)}</span>
                      <span>{t('presupuestos.anual')}: {formatEuro(p.amountMensual * 12)}</span>
                    </div>
                  </div>

                  <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{
                        width: `${Math.min(porcentaje, 100)}%`,
                        backgroundColor: excedido ? '#ef4444' : (cat?.color ?? '#6b7280'),
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('presupuestos.editarPresupuesto') : t('presupuestos.nuevoPresupuesto')}
            </DialogTitle>
            <DialogDescription>
              {editingId ? t('presupuestos.editarDescripcion') : t('presupuestos.crearDescripcion')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('presupuestos.categoria')}</Label>
              <select
                value={formCategoria}
                onChange={e => setFormCategoria(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                disabled={!!editingId}
              >
                <option value="">{t('presupuestos.seleccionarCategoria')}</option>
                {CATEGORIA_OPTIONS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('presupuestos.importeMensual')} (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formMensual}
                onChange={e => setFormMensual(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancelar')}
            </Button>
            <Button onClick={handleGuardar}>
              {editingId ? t('common.guardar') : t('common.crear')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!eliminandoId} onOpenChange={() => setEliminandoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('presupuestos.confirmarEliminar')}</DialogTitle>
            <DialogDescription>{t('presupuestos.confirmarEliminarDescripcion')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminandoId(null)}>
              {t('common.cancelar')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => eliminandoId && handleEliminar(eliminandoId)}
            >
              {t('common.eliminar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
