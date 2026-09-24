'use client'

import { useState } from 'react'
import { useEmpresaActiva } from '@/contexts/empresa-activa-context'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, Check, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EmpresaSelector() {
  const { empresaActiva, empresas, seleccionarEmpresa, crearEmpresa } = useEmpresaActiva()
  const { t } = useLanguage()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nuevaNombre, setNuevaNombre] = useState('')
  const [nuevaNif, setNuevaNif] = useState('')
  const [nuevaDireccion, setNuevaDireccion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleCrear = async () => {
    setGuardando(true)
    setError('')
    try {
      await crearEmpresa({
        nombre: nuevaNombre,
        nif: nuevaNif,
        direccion: nuevaDireccion,
      })
      setDialogOpen(false)
      setNuevaNombre('')
      setNuevaNif('')
      setNuevaDireccion('')
    } catch {
      setError(t('empresa.error'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden max-w-[14ch] truncate sm:inline">
              {empresaActiva?.nombre ?? t('empresa.miEmpresa')}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t('empresa.seleccionar')}</DropdownMenuLabel>
          {empresas.map(empresa => (
            <DropdownMenuItem key={empresa.id} onClick={() => seleccionarEmpresa(empresa.id)}>
              <Building2 className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm">{empresa.nombre}</span>
                <span className="text-xs text-muted-foreground">{empresa.nif}</span>
              </div>
              {empresaActiva?.id === empresa.id && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('empresa.nueva')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('empresa.crearTitulo')}</DialogTitle>
            <DialogDescription>
              {t('empresa.crearDescripcion')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="emp-nombre">{t('empresa.nombre')}</Label>
              <Input id="emp-nombre" value={nuevaNombre} onChange={e => setNuevaNombre(e.target.value)} placeholder="Mi Empresa S.L." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-nif">{t('empresa.nif')}</Label>
              <Input id="emp-nif" value={nuevaNif} onChange={e => setNuevaNif(e.target.value)} placeholder="B12345678" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp-direccion">{t('empresa.direccion')}</Label>
              <Input id="emp-direccion" value={nuevaDireccion} onChange={e => setNuevaDireccion(e.target.value)} placeholder="Calle Example 123, Madrid" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancelar')}</Button>
            <Button onClick={handleCrear} disabled={guardando || !nuevaNombre}>
              {guardando ? t('common.guardando') : t('common.crear')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
