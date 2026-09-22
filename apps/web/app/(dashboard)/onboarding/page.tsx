'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Circle,
  Receipt,
  FileText,
  Landmark,
  Users,
  Calculator,
  Home,
  Wallet,
  Sparkles,
  Clipboard,
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

const PASOS = [
  { titulo: 'Bienvenido', icono: Sparkles },
  { titulo: 'Tipo de usuario', icono: Users },
  { titulo: 'Datos fiscales', icono: Landmark },
  { titulo: 'Necesidades', icono: Clipboard },
  { titulo: 'Primeros pasos', icono: CheckCircle },
  { titulo: 'Listo', icono: Sparkles },
]

const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
  'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Comunidad Valenciana',
  'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra',
  'País Vasco',
]

export default function OnboardingPage() {
  const [paso, setPaso] = useState(0)
  const [tipoUsuario, setTipoUsuario] = useState<'autonomo' | 'asesor' | ''>('')
  const [nombre, setNombre] = useState('')
  const [nif, setNif] = useState('')
  const [comunidad, setComunidad] = useState('')
  const [necesidades, setNecesidades] = useState<string[]>([])
  const { t } = useLanguage()
  const router = useRouter()

  const toggleNecesidad = (necesidad: string) => {
    setNecesidades(prev =>
      prev.includes(necesidad) ? prev.filter(n => n !== necesidad) : [...prev, necesidad]
    )
  }

  const siguiente = () => setPaso(p => Math.min(p + 1, PASOS.length - 1))
  const anterior = () => setPaso(p => Math.max(p - 1, 0))

  const completado = paso === PASOS.length - 1

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('onboarding.paso')} {paso + 1} {t('onboarding.de')} {PASOS.length}</span>
          <span>{PASOS[paso]?.titulo}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2">
        {PASOS.map((p, i) => (
          <div key={p.titulo} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < paso
                  ? 'bg-primary text-primary-foreground'
                  : i === paso
                    ? 'border-2 border-primary text-primary'
                    : 'border border-muted-foreground/30 text-muted-foreground'
              }`}
            >
              {i < paso ? (
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
              ) : (
                <p.icono className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
            {i < PASOS.length - 1 && (
              <div className={`mx-1 h-0.5 w-8 ${i < paso ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-8">
          {/* Step 0: Welcome */}
          {paso === 0 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('onboarding.bienvenido')}</h2>
                <p className="mt-2 text-muted-foreground">{t('onboarding.bienvenidoDesc')}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-left">
                {[
                  { icon: Receipt, label: t('onboarding.facturas') },
                  { icon: FileText, label: t('onboarding.modelosFiscales') },
                  { icon: Calculator, label: t('fiscal.calculadoras') },
                  { icon: Wallet, label: t('nominas.titulo') },
                  { icon: Home, label: t('alquiler.titulo') },
                  { icon: Users, label: t('personaSelector.miPerfil') },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 rounded-lg border p-3">
                    <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: User type */}
          {paso === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">{t('onboarding.datosEmpresa')}</h2>
                <p className="text-sm text-muted-foreground">{t('onboarding.datosEmpresaDesc')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'autonomo', label: t('asistenteFiscal.autonomo'), icon: Receipt },
                  { value: 'asesor', label: t('personaSelector.gestor'), icon: Users },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTipoUsuario(opt.value as 'autonomo' | 'asesor')}
                    className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors ${
                      tipoUsuario === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    <opt.icon className={`h-8 w-8 ${tipoUsuario === opt.value ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Tax data */}
          {paso === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">{t('onboarding.datosEmpresa')}</h2>
                <p className="text-sm text-muted-foreground">{t('onboarding.datosEmpresaDesc')}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="onb-nombre">{t('onboarding.nombreEmpresa')}</Label>
                  <Input
                    id="onb-nombre"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder={t('ajustes.placeholderNombre')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onb-nif">{t('onboarding.nifCif')}</Label>
                  <Input
                    id="onb-nif"
                    value={nif}
                    onChange={e => setNif(e.target.value)}
                    placeholder="12345678A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('fiscalPage.comunidadAutonoma')}</Label>
                  <select
                    value={comunidad}
                    onChange={e => setComunidad(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t('onboarding.direccion')}</option>
                    {COMUNIDADES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Needs */}
          {paso === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">{t('guia.queNecesitas')}</h2>
                <p className="text-sm text-muted-foreground">Selecciona lo que necesitas para tu actividad</p>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'facturas', label: t('onboarding.facturas'), icon: Receipt },
                  { id: 'trimestres', label: t('trimestres.titulo'), icon: FileText },
                  { id: 'nominas', label: t('nominas.titulo'), icon: Users },
                  { id: 'alquiler', label: t('alquiler.titulo'), icon: Home },
                  { id: 'calculadoras', label: t('fiscal.calculadoras'), icon: Calculator },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleNecesidad(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                      necesidades.includes(item.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    <Checkbox
                      checked={necesidades.includes(item.id)}
                      aria-label={item.label}
                    />
                    <item.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: First steps */}
          {paso === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">{t('onboarding.primerosPasos')}</h2>
                <p className="text-sm text-muted-foreground">{t('onboarding.primerosPasosDesc')}</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: t('onboarding.crearPrimeraFactura'), href: '/gestoria/facturas/nueva', icon: Receipt },
                  ...(necesidades.includes('trimestres') ? [{ label: t('onboarding.verCalculadorasFiscales'), href: '/fiscal', icon: Calculator }] : []),
                  { label: t('onboarding.importarFacturasCsv'), href: '/gestoria/facturas', icon: FileText },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg border p-3">
                    <CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                    <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {paso === 5 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-10 w-10 text-emerald-600" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('onboarding.bienvenido')}!</h2>
                <p className="mt-2 text-muted-foreground">Todo listo. Ya puedes empezar a usar MantiGestor.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={anterior}
          disabled={paso === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('onboarding.atras')}
        </Button>

        {completado ? (
          <Button onClick={() => router.push('/dashboard')}>
            {t('onboarding.siguiente')}
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={siguiente}>
            {t('onboarding.siguiente')}
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
