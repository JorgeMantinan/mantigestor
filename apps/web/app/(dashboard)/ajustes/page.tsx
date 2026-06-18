'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type Tab = 'perfil' | 'suscripcion' | 'apariencia'

export default function AjustesPage() {
  const [tab, setTab] = useState<Tab>('perfil')

  const tabs: { value: Tab; label: string }[] = [
    { value: 'perfil', label: 'Perfil' },
    { value: 'suscripcion', label: 'Suscripción' },
    { value: 'apariencia', label: 'Apariencia' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground">Gestiona tu cuenta y preferencias</p>
      </div>

      <div className="flex gap-1 rounded-lg border p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <PerfilTab />}
      {tab === 'suscripcion' && <SuscripcionTab />}
      {tab === 'apariencia' && <AparienciaTab />}
    </div>
  )
}

function PerfilTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información personal</CardTitle>
        <CardDescription>Actualiza tus datos fiscales y de contacto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input id="nombre" placeholder="Tu nombre" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="tu@email.com" disabled />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nif">NIF / CIF</Label>
            <Input id="nif" placeholder="12345678Z" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provincia">Provincia fiscal</Label>
            <Input id="provincia" placeholder="Madrid" />
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="situacion">Situación laboral</Label>
          <select
            id="situacion"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Selecciona...</option>
            <option value="autonomo_puro">Autónomo (solo)</option>
            <option value="autonomo_con_nomina">Autónomo con nómina</option>
            <option value="asalariado">Asalariado</option>
            <option value="pensionista">Pensionista</option>
            <option value="desempleado">Desempleado</option>
          </select>
        </div>
        <Button>Guardar cambios</Button>
      </CardContent>
    </Card>
  )
}

function SuscripcionTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suscripción</CardTitle>
        <CardDescription>Gestiona tu plan y método de pago</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Plan actual</p>
              <p className="text-sm text-muted-foreground">
                Disfrutas de un periodo de prueba PRO gratuito
              </p>
            </div>
            <div className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              PRO · PRUEBA
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Método de pago</Label>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" disabled>
              Stripe
            </Button>
            <Button variant="outline" className="flex-1" disabled>
              PayPal
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Podrás configurar el pago al finalizar el periodo de prueba
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function AparienciaTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
        <CardDescription>Personaliza cómo ves MantiGestor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tema</Label>
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1">
              Claro
            </Button>
            <Button variant="outline" className="flex-1">
              Oscuro
            </Button>
            <Button variant="outline" className="flex-1">
              Sistema
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
