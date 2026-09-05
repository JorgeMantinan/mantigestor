'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Calculator, Upload, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/language-context'

interface OnboardingWizardProps {
  abierto: boolean
  onCompletado: () => void
}

export function OnboardingWizard({ abierto, onCompletado }: OnboardingWizardProps) {
  const [paso, setPaso] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [empresaNif, setEmpresaNif] = useState('')
  const [empresaDireccion, setEmpresaDireccion] = useState('')
  const { t } = useLanguage()

  const PASOS = [t('onboarding.bienvenido'), t('onboarding.datosEmpresa'), t('onboarding.primerosPasos')]
  const porcentaje = ((paso + 1) / PASOS.length) * 100

  async function guardarDatosEmpresa() {
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('perfiles').upsert({
        id: user.id,
        userId: user.id,
        email: user.email ?? '',
      })
    } catch {
      // Silenciar error — los datos se pueden completar después
    } finally {
      setGuardando(false)
    }
  }

  function handleAtras() {
    if (paso > 0) setPaso(paso - 1)
  }

  async function handleSiguiente() {
    if (paso === 1) {
      await guardarDatosEmpresa()
    }
    if (paso < PASOS.length - 1) {
      setPaso(paso + 1)
    }
  }

  function handleFinalizar() {
    localStorage.setItem('mantigestor_onboarding_completado', 'true')
    onCompletado()
  }

  return (
    <Dialog open={abierto}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{PASOS[paso]}</DialogTitle>
          <DialogDescription>
            {t('onboarding.paso')} {paso + 1} {t('onboarding.de')} {PASOS.length}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        {/* Paso 0: Bienvenida */}
        {paso === 0 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t('onboarding.bienvenidoDesc')}
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium">{t('onboarding.facturas')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50">
                <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium">{t('onboarding.modelosFiscales')}</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50">
                <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium">{t('onboarding.documentos')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Paso 1: Datos empresa */}
        {paso === 1 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t('onboarding.datosEmpresaDesc')}
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="empresa-nombre">{t('onboarding.nombreEmpresa')}</Label>
                <Input
                  id="empresa-nombre"
                  placeholder="Mi Empresa S.L."
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empresa-nif">{t('onboarding.nifCif')}</Label>
                <Input
                  id="empresa-nif"
                  placeholder="B12345678"
                  value={empresaNif}
                  onChange={(e) => setEmpresaNif(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empresa-direccion">{t('onboarding.direccion')}</Label>
                <Input
                  id="empresa-direccion"
                  placeholder="Calle Ejemplo 123, Madrid"
                  value={empresaDireccion}
                  onChange={(e) => setEmpresaDireccion(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Paso 2: Primeros pasos */}
        {paso === 2 && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t('onboarding.primerosPasosDesc')}
            </p>
            <div className="space-y-2">
              <Link
                href="/gestoria/facturas/nueva"
                onClick={handleFinalizar}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium">{t('onboarding.crearPrimeraFactura')}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Link>
              <Link
                href="/fiscal"
                onClick={handleFinalizar}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium">{t('onboarding.verCalculadorasFiscales')}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Link>
              <Link
                href="/gestoria/facturas"
                onClick={handleFinalizar}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Upload className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium">{t('onboarding.importarFacturasCsv')}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-between pt-2">
          {paso > 0 ? (
            <Button variant="outline" onClick={handleAtras}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('onboarding.atras')}
            </Button>
          ) : (
            <div />
          )}

          {paso < PASOS.length - 1 ? (
            <Button onClick={handleSiguiente} disabled={guardando}>
              {guardando ? t('onboarding.guardar') : t('onboarding.siguiente')}
              {!guardando && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
            </Button>
          ) : (
            <Button onClick={handleFinalizar}>
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('onboarding.empezar')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
