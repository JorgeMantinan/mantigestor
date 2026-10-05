'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Circle,
  Briefcase,
  Building2,
  Euro,
  User,
  ClipboardList,
  FileText,
  Shield,
  Calculator,
  Calendar,
} from 'lucide-react'

const PASOS = [
  { titulo: 'Actividad', icono: Briefcase },
  { titulo: 'Clientes', icono: Building2 },
  { titulo: 'Ingresos', icono: Euro },
  { titulo: 'Datos', icono: User },
  { titulo: 'Próximos pasos', icono: ClipboardList },
]

const TIPOS_ACTIVIDAD = [
  { id: 'servicios_profesionales', label: 'Servicios profesionales', desc: 'Consultoría, diseño, programación, abogado, etc.' },
  { id: 'comercio', label: 'Comercio', desc: 'Venta de productos, tienda online, etc.' },
  { id: 'hosteleria', label: 'Hostelería', desc: 'Restaurante, bar, cafetería, etc.' },
  { id: 'construccion', label: 'Construcción / Reformas', desc: 'Albañilería, electricidad, fontanería, etc.' },
  { id: 'transporte', label: 'Transporte', desc: 'Taxi, mensajería, logística, etc.' },
  { id: 'agricultura', label: 'Agricultura / Ganadería', desc: 'Explotaciones agrarias, ganadería, etc.' },
  { id: 'otra', label: 'Otra actividad', desc: 'Actividad no listada' },
]

const COMUNIDADES_AUTONOMAS = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
  'Castilla y León', 'Castilla-La Mancha', 'Cataluña', 'Extremadura',
  'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco',
  'Valencia',
]

const CHECKLIST = [
  { texto: 'Darse de alta en Hacienda (Modelo 036/037)', icono: FileText, urgencia: 'alta' as const },
  { texto: 'Darse de alta en la Seguridad Social (RETA)', icono: Shield, urgencia: 'alta' as const },
  { texto: 'Elegir régimen de IVA (general o simplificado)', icono: Calculator, urgencia: 'media' as const },
  { texto: 'Elegir método de IRPF (estimación directa o módulos)', icono: Calculator, urgencia: 'media' as const },
  { texto: 'Abrir cuenta bancaria profesional (recomendado)', icono: Building2, urgencia: 'baja' as const },
  { texto: 'Contratar un asesor fiscal (recomendado)', icono: User, urgencia: 'baja' as const },
  { texto: 'Plazos del primer trimestre: Modelo 036/037 + Modelo 130 (IRPF) + Modelo 303 (IVA)', icono: Calendar, urgencia: 'alta' as const },
]

const URGENCIA_COLORS = {
  alta: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  baja: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

export default function PrimerTrimestrePage() {
  const [paso, setPaso] = useState(0)
  const [actividad, setActividad] = useState('')
  const [vendeEmpresas, setVendeEmpresas] = useState<boolean | null>(null)
  const [ingresosAnuales, setIngresosAnuales] = useState('')
  const [nif, setNif] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [comunidad, setComunidad] = useState('')
  const [checklist, setChecklist] = useState<Record<number, boolean>>({})

  const toggleCheck = (idx: number) => {
    setChecklist(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const ingresosNum = parseFloat(ingresosAnuales) || 0

  const getRegimenRecomendado = () => {
    if (ingresosNum <= 0) return null
    if (ingresosNum < 120000) return 'régimen simplificado'
    return 'régimen general'
  }

  const getMetodoIrpf = () => {
    if (ingresosNum <= 0) return null
    if (ingresosNum < 60000 && actividad !== 'servicios_profesionales') return 'estimación objetiva (módulos)'
    return 'estimación directa'
  }

  const siguiente = () => setPaso(p => Math.min(p + 1, PASOS.length - 1))
  const anterior = () => setPaso(p => Math.max(p - 1, 0))

  const puedeAvanzar = () => {
    switch (paso) {
      case 0: return !!actividad
      case 1: return vendeEmpresas !== null
      case 2: return ingresosNum > 0
      case 3: return !!nif && !!fechaInicio && !!comunidad
      default: return true
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi primer trimestre</h1>
        <p className="text-muted-foreground">
          Wizard paso a paso para autónomos nuevos
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {PASOS.map((p, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${i <= paso ? 'text-primary' : 'text-muted-foreground'}`}>
              {i < paso ? (
                <CheckCircle className="h-5 w-5 shrink-0" />
              ) : i === paso ? (
                <p.icono className="h-5 w-5 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 shrink-0" />
              )}
              <span className="text-xs font-medium hidden sm:inline">{p.titulo}</span>
            </div>
            {i < PASOS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${i < paso ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = PASOS[paso]?.icono ?? Circle
              return <Icon className="h-5 w-5" />
            })()}
            Paso {paso + 1}: {PASOS[paso]?.titulo ?? ''}
          </CardTitle>
          <CardDescription>
            {paso === 0 && 'Selecciona el tipo de actividad que vas a realizar'}
            {paso === 1 && '¿A quién vas a vender tus servicios o productos?'}
            {paso === 2 && 'Una estimación aproximada para elegir el mejor régimen fiscal'}
            {paso === 3 && 'Datos básicos para tu alta como autónomo'}
            {paso === 4 && 'Checklist de tareas pendientes para darte de alta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Paso 0: Tipo de actividad */}
          {paso === 0 && (
            <div className="space-y-3">
              {TIPOS_ACTIVIDAD.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActividad(t.id)}
                  className={`w-full text-left rounded-lg border p-4 transition-colors ${
                    actividad === t.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t.label}</p>
                      <p className="text-sm text-muted-foreground">{t.desc}</p>
                    </div>
                    {actividad === t.id && (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Paso 1: Clientes */}
          {paso === 1 && (
            <div className="space-y-3">
              <button
                onClick={() => setVendeEmpresas(true)}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  vendeEmpresas === true
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">A empresas (B2B)</p>
                    <p className="text-sm text-muted-foreground">
                      Facturas con IVA repercutido. Tus clientes deducen el IVA.
                      Necesitas Modelo 303 trimestral.
                    </p>
                  </div>
                  {vendeEmpresas === true && (
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              </button>
              <button
                onClick={() => setVendeEmpresas(false)}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  vendeEmpresas === false
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">A particulares (B2C)</p>
                    <p className="text-sm text-muted-foreground">
                      El consumidor final paga IVA pero no puede deducírselo.
                      Puedes optar por módulos si cumples requisitos.
                    </p>
                  </div>
                  {vendeEmpresas === false && (
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Paso 2: Ingresos */}
          {paso === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ingresos">Estimación de ingresos anuales (€)</Label>
                <Input
                  id="ingresos"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="Ej: 30000"
                  value={ingresosAnuales}
                  onChange={e => setIngresosAnuales(e.target.value)}
                />
              </div>
              {ingresosNum > 0 && (
                <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                  <p className="text-sm font-medium">Recomendación automática:</p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Régimen de IVA: </span>
                      <Badge variant={getRegimenRecomendado() === 'régimen simplificado' ? 'default' : 'secondary'}>
                        {getRegimenRecomendado()}
                      </Badge>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Método IRPF: </span>
                      <Badge variant={getMetodoIrpf()?.includes('módulos') ? 'default' : 'secondary'}>
                        {getMetodoIrpf()}
                      </Badge>
                    </p>
                    {ingresosNum < 120000 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Con menos de 120.000€ de facturación, puedes acogerte al régimen simplificado.
                      </p>
                    )}
                    {ingresosNum >= 120000 && (
                      <p className="text-xs text-destructive mt-2">
                        Con más de 120.000€, estás obligado al régimen general de IVA.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paso 3: Datos */}
          {paso === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nif">NIF / CIF</Label>
                <Input
                  id="nif"
                  placeholder="Ej: 12345678Z"
                  value={nif}
                  onChange={e => setNif(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha-inicio">Fecha de inicio de actividad</Label>
                <Input
                  id="fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comunidad">Comunidad autónoma</Label>
                <select
                  id="comunidad"
                  value={comunidad}
                  onChange={e => setComunidad(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {COMUNIDADES_AUTONOMAS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Paso 4: Checklist */}
          {paso === 4 && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 bg-muted/30 space-y-1">
                <p className="text-sm font-medium">Resumen de tu situación:</p>
                <p className="text-xs text-muted-foreground">
                  Actividad: {TIPOS_ACTIVIDAD.find(a => a.id === actividad)?.label} ·
                  {' '}{vendeEmpresas ? 'Venta a empresas' : 'Venta a particulares'} ·
                  {' '}{ingresosNum.toLocaleString('es-ES')}€/año ·
                  {' '}{comunidad}
                </p>
              </div>

              {CHECKLIST.map((item, idx) => {
                const _Icon = item.icono
                const completado = checklist[idx] ?? false
                return (
                  <button
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      completado ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted'
                    }`}
                  >
                    <CheckCircle className={`h-5 w-5 shrink-0 mt-0.5 ${completado ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${completado ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                        {item.texto}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-xs shrink-0 ${URGENCIA_COLORS[item.urgencia]}`}>
                      {item.urgencia}
                    </Badge>
                  </button>
                )
              })}

              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:bg-yellow-950 dark:border-yellow-700">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ⏰ Plazos importantes del primer trimestre
                </p>
                <ul className="mt-2 space-y-1 text-xs text-yellow-700 dark:text-yellow-300">
                  <li>• Modelo 036/037: Alta en Hacienda antes del inicio de actividad</li>
                  <li>• Alta RETA (Seguridad Social): dentro de los 30 días naturales del alta</li>
                  <li>• Primer Modelo 303 (IVA trimestral): del 1 al 20 de abril</li>
                  <li>• Primer Modelo 130 (IRPF trimestral): del 1 al 20 de abril</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={anterior}
          disabled={paso === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>
        {paso < PASOS.length - 1 ? (
          <Button
            onClick={siguiente}
            disabled={!puedeAvanzar()}
          >
            Siguiente
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => {
              setPaso(0)
              setActividad('')
              setVendeEmpresas(null)
              setIngresosAnuales('')
              setNif('')
              setFechaInicio('')
              setComunidad('')
              setChecklist({})
            }}
          >
            Empezar de nuevo
          </Button>
        )}
      </div>
    </div>
  )
}
