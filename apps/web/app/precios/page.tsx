'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const planes = [
  {
    nombre: 'BASIC',
    precio: '0 €',
    descripcion: 'Para empezar con lo esencial',
    features: [
      '10 facturas/mes con OCR básico',
      'Trimestres automáticos (Modelo 303)',
      'Hasta 10 alumnos',
      'Gestión de alquiler',
      'Documentos hasta 50MB',
      'Soporte por email',
    ],
    tier: 'free',
    destacado: false,
    cta: 'Empezar gratis',
    href: '/register',
  },
  {
    nombre: 'PRO',
    precio: '15 €',
    descripcion: '/mes — Para autónomos que facturan sin límite',
    features: [
      'Facturas ilimitadas con OCR IA',
      'Nóminas para empleadas del hogar',
      'Alumnos ilimitados',
      'Chat con documentos con IA',
      'Exámenes generados por IA',
      'Documentos hasta 5GB',
      'Conversiones de moneda y unidades',
      'Soporte prioritario',
    ],
    tier: 'pro',
    destacado: true,
    cta: 'Probar 30 días gratis',
    href: '/register?tier=pro',
  },
]

export default function PreciosPage() {
  const [loading, setLoading] = useState(false)
  const { user, cargando } = useAuth()
  const [stripeOk, setStripeOk] = useState(true)

  async function handleProCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.disponible === false) { setStripeOk(false); setLoading(false); return }
      if (data.url) { window.location.href = data.url }
    } catch { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">M</span>
              </div>
              <span className="text-xl font-heading font-semibold">MantiGestor</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            {cargando ? null : user ? (
              <>
                <Link href="/dashboard" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">
                    ← Volver al Dashboard
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button>Ir al dashboard</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/">
                  <Button variant="ghost">← Volver</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost">Iniciar sesión</Button>
                </Link>
                <Link href="/register">
                  <Button>Crear cuenta</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-24 text-center">
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl">
            Precios sencillos,{' '}
            <span className="text-primary">sin sorpresas</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Elige el plan que mejor se adapte a tu actividad. Todos incluyen 30 días de prueba
            gratuita del plan PRO.
          </p>
        </section>

        <section className="container pb-24">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            {planes.map((plan) => (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${plan.destacado ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    RECOMENDADO
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.nombre}</CardTitle>
                  <CardDescription className="text-lg">{plan.descripcion}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.precio}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <svg
                          className="h-4 w-4 shrink-0 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="3"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {plan.tier === 'pro' ? (
                    <Button
                      onClick={handleProCheckout}
                      variant="default"
                      size="lg"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? 'Redirigiendo...' : stripeOk ? plan.cta : 'Próximamente'}
                    </Button>
                  ) : (
                    <Link href={user ? '/dashboard' : plan.href} className="w-full">
                      <Button variant="outline" size="lg" className="w-full">
                        {user ? 'Ir al dashboard' : plan.cta}
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} MantiGestor. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}
