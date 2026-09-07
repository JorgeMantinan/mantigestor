'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Mail, Save, Loader2, Zap, Shield, BellOff } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface Preferencia {
  canal: 'in_app' | 'email'
  categoria: string
  diasAntelacion: number
  activo: boolean
}

const CATEGORIAS = [
  { key: 'todos', label: 'Todos los modelos', descripcion: 'Recibir para todos los modelos fiscales' },
  { key: 'iva', label: 'IVA (303, 390)', descripcion: 'Liquidaciones trimestrales y resumen anual de IVA' },
  { key: 'irpf', label: 'IRPF (130, 100)', descripcion: 'Pagos fraccionados y declaración anual' },
  { key: 'retenciones', label: 'Retenciones (111, 190)', descripcion: 'Retenciones a trabajadores y profesionales' },
  { key: 'renta', label: 'Renta (100, 720)', descripcion: 'Declaración de la Renta y bienes en el extranjero' },
] as const

const DIAS_OPCIONES = [1, 3, 7, 15, 30]

function preferenciaDefault(canal: 'in_app' | 'email', categoria: string): Preferencia {
  return {
    canal,
    categoria,
    diasAntelacion: canal === 'email' ? 1 : 15,
    activo: canal === 'in_app',
  }
}

export function NotificacionesPageClient() {
  const { t } = useLanguage()
  const [preferencias, setPreferencias] = useState<Preferencia[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  const cargarPreferencias = useCallback(async () => {
    try {
      const res = await fetch('/api/fiscal/preferencias-notificaciones')
      if (!res.ok) throw new Error(t('notificacionesConfig.errorCargar'))
      const data = await res.json()
      const existentes = (data.preferencias ?? []) as Preferencia[]

      // Rellenar las que faltan con defaults
      const completas: Preferencia[] = []
      for (const cat of CATEGORIAS) {
        for (const canal of ['in_app', 'email'] as const) {
          const existente =existentes.find(
            p => p.categoria === cat.key && p.canal === canal
          )
          completas.push(existente ?? preferenciaDefault(canal, cat.key))
        }
      }
      setPreferencias(completas)
    } catch {
      // Si falla, crear defaults
      const defaults: Preferencia[] = []
      for (const cat of CATEGORIAS) {
        for (const canal of ['in_app', 'email'] as const) {
          defaults.push(preferenciaDefault(canal, cat.key))
        }
      }
      setPreferencias(defaults)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    void cargarPreferencias()
  }, [cargarPreferencias])

  function actualizar(canal: 'in_app' | 'email', categoria: string, campo: keyof Preferencia, valor: unknown) {
    setPreferencias(prev =>
      prev.map(p =>
        p.canal === canal && p.categoria === categoria
          ? { ...p, [campo]: valor }
          : p
      )
    )
    setExito(false)
  }

  async function guardar() {
    setGuardando(true)
    setError('')
    setExito(false)
    try {
      const res = await fetch('/api/fiscal/preferencias-notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferencias }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('notificacionesConfig.errorGuardar'))
      }
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('notificacionesConfig.errorGuardar'))
    }
    setGuardando(false)
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">{t('notificacionesConfig.titulo')}</h1>
        <p className="text-muted-foreground">{t('notificacionesConfig.subtitulo')}</p>
      </div>

      {/* Presets */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">{t('notificacionesConfig.atajos')}</span>
            <Button variant="outline" size="sm"
              onClick={() => {
                setPreferencias(prev => prev.map(p => ({
                  ...p,
                  activo: p.canal === 'in_app',
                  diasAntelacion: p.canal === 'email' ? 1 : 15,
                })))
              }}>
              <Zap className="mr-1 h-3 w-3" /> {t('notificacionesConfig.recomendado')}
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => {
                setPreferencias(prev => prev.map(p => ({
                  ...p,
                  activo: true,
                  diasAntelacion: p.canal === 'email' ? 7 : 15,
                })))
              }}>
              <Shield className="mr-1 h-3 w-3" /> {t('notificacionesConfig.maximo')}
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => {
                setPreferencias(prev => prev.map(p => ({ ...p, activo: false })))
              }}>
              <BellOff className="mr-1 h-3 w-3" /> {t('notificacionesConfig.desactivarTodos')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {CATEGORIAS.map(cat => (
        <Card key={cat.key}>
          <CardHeader>
            <CardTitle className="text-lg">{cat.label}</CardTitle>
            <CardDescription>{cat.descripcion}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* In-app */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{t('notificacionesConfig.notificacionInApp')}</p>
                  <p className="text-xs text-muted-foreground">{t('notificacionesConfig.descInApp')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={preferencias.find(p => p.canal === 'in_app' && p.categoria === cat.key)?.diasAntelacion ?? 15}
                  onChange={e => actualizar('in_app', cat.key, 'diasAntelacion', parseInt(e.target.value))}
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                >
                  {DIAS_OPCIONES.map(d => (
                    <option key={d} value={d}>{t('notificacionesConfig.diasAntes').replace('{dias}', String(d))}</option>
                  ))}
                </select>
                <Switch
                  checked={preferencias.find(p => p.canal === 'in_app' && p.categoria === cat.key)?.activo ?? false}
                  onCheckedChange={checked => actualizar('in_app', cat.key, 'activo', checked)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{t('notificacionesConfig.email')}</p>
                  <p className="text-xs text-muted-foreground">{t('notificacionesConfig.descEmail')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={preferencias.find(p => p.canal === 'email' && p.categoria === cat.key)?.diasAntelacion ?? 1}
                  onChange={e => actualizar('email', cat.key, 'diasAntelacion', parseInt(e.target.value))}
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                >
                  {DIAS_OPCIONES.map(d => (
                    <option key={d} value={d}>{t('notificacionesConfig.diasAntes').replace('{dias}', String(d))}</option>
                  ))}
                </select>
                <Switch
                  checked={preferencias.find(p => p.canal === 'email' && p.categoria === cat.key)?.activo ?? false}
                  onCheckedChange={checked => actualizar('email', cat.key, 'activo', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {exito && <p className="text-sm text-green-600">{t('notificacionesConfig.preferenciasGuardadas')}</p>}

      <div className="flex justify-end">
        <Button onClick={() => void guardar()} disabled={guardando}>
          {guardando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {guardando ? t('notificacionesConfig.guardando') : t('notificacionesConfig.guardarPreferencias')}
        </Button>
      </div>
    </div>
  )
}
