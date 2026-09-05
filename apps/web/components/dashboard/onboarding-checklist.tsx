'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Plus, Calculator, FileText, Receipt } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface Paso {
  completado: boolean
  label: string
  href: string
  icon: React.ReactNode
}

interface Props {
  tienePerfil: boolean
  tieneFacturas: boolean
  tieneCalculadoras: boolean
}

export function OnboardingChecklist({ tienePerfil, tieneFacturas, tieneCalculadoras }: Props) {
  const { t } = useLanguage()
  const pasos: Paso[] = [
    {
      completado: tienePerfil,
      label: t('onboarding.completarPerfil'),
      href: '/ajustes',
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      completado: tieneFacturas,
      label: t('onboarding.anadirFactura'),
      href: '/gestoria/facturas/nueva',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      completado: tieneCalculadoras,
      label: t('onboarding.explorarCalculadoras'),
      href: '/fiscal',
      icon: <Calculator className="h-4 w-4" />,
    },
  ]

  const completados = pasos.filter(p => p.completado).length

  if (completados === pasos.length) return null

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('onboarding.primerosPasos')}</CardTitle>
          <span className="text-xs text-muted-foreground">{completados}/{pasos.length}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${(completados / pasos.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {pasos.map((paso) => (
            <li key={paso.href}>
              {paso.completado ? (
                <div className="flex items-center gap-3 rounded-lg p-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span className="line-through">{paso.label}</span>
                </div>
              ) : (
                <Link
                  href={paso.href}
                  className="flex items-center justify-between rounded-lg border p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {paso.label}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Plus className="mr-1 h-3 w-3" /> {t('onboarding.completar')}
                  </Button>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
