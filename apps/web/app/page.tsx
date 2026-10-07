import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Receipt,
  Calculator,
  Users,
  FileText,
  Camera,
  Home,
  Check,
  ChevronDown,
  Star,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Receipt,
    title: 'Facturas con IA',
    description:
      'Fotografía cualquier factura o ticket y la IA extrae los datos automáticamente. Incluso manuscritos.',
  },
  {
    icon: Calculator,
    title: 'Control fiscal',
    description:
      'Modelo 303, 130, 111, 100 y más. Cálculos automáticos con alertas de vencimientos y guías paso a paso.',
  },
  {
    icon: Users,
    title: 'Nóminas y retenciones',
    description:
      'Genera nóminas, calcula retenciones IRPF y gestiona tus empleados de forma sencilla.',
  },
  {
    icon: Home,
    title: 'Alquileres',
    description:
      'Controla propiedades, inquilinos, cobros y gastos deducibles de tus alquileres.',
  },
  {
    icon: FileText,
    title: 'Documentos',
    description:
      'Almacena y organiza todos tus documentos fiscales. Backup automático en la nube.',
  },
  {
    icon: Camera,
    title: 'Escanear tickets',
    description:
      'Escanea tickets de gastos deducibles con la cámara de tu móvil y súbelos al instante.',
  },
]

const PRICING = [
  {
    name: 'Básico',
    price: 'Gratis',
    description: 'Para autónomos que empiezan',
    features: [
      '10 facturas al mes',
      'Trimestres automáticos',
      '10 alumnos/propiedades',
      'Alquiler básico',
      '50MB documentos',
    ],
    cta: 'Empezar gratis',
    href: '/register',
    popular: false,
  },
  {
    name: 'PRO',
    price: '$15/mes',
    description: 'Para autónomos que crecen',
    features: [
      'Facturas ilimitadas',
      'Nóminas y retenciones',
      'Alumnos/propiedades ilimitados',
      'IA asistente',
      '5GB documentos',
      'Conversiones de divisa',
      'Benchmarking',
    ],
    cta: 'Prueba 30 días gratis',
    href: '/register',
    popular: true,
  },
]

const TESTIMONIALS = [
  {
    name: 'María García',
    role: 'Diseñadora freelance',
    text: 'MantiGestor me ha ahorrado horas cada trimestre. Antes usaba Excel y ahora todo es automático. La IA para escanear facturas es increíble.',
    rating: 5,
  },
  {
    name: 'Carlos López',
    role: 'Consultor TI',
    text: 'Como autónomo con varios clientes, controlar facturas y准备declaraciones era un suplicio. Ahora lo tengo todo en un sitio y no me pierdo ningún plazo.',
    rating: 5,
  },
  {
    name: 'Ana Martínez',
    role: 'Arquitecta',
    text: 'La parte de alquileres es perfecta. Controlo mis 3 propiedades, inquilinos y gastos deducibles sin complicaciones. Muy recomendable.',
    rating: 5,
  },
]

const FAQS = [
  {
    q: '¿Necesito conocimientos contables?',
    a: 'No. MantiGestor está diseñado para autónomos sin formación contable. La IA te guía paso a paso en cada proceso.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Sí. Usamos Supabase (PostgreSQL) con encriptación en tránsito y en reposo. Tus datos nunca se comparten con terceros.',
  },
  {
    q: '¿Puedo probarlo antes de pagar?',
    a: '¡Por supuesto! El plan Básico es gratuito y el PRO incluye 30 días de prueba sin compromiso.',
  },
  {
    q: '¿Soporta varios autónomos?',
    a: 'Sí. Puedes gestionar múltiples perfiles (cónyuge, familiares) desde una sola cuenta con el sistema multi-persona.',
  },
  {
    q: '¿Qué modelos fiscales soporta?',
    a: 'Soportamos más de 30 modelos: 303, 130, 111, 100, 347, 349, 190, 200, plusvalía municipal y muchos más.',
  },
]

export const metadata: Metadata = {
  title: {
    absolute: 'MantiGestor - Gestión inteligente para autónomos con IA',
  },
  description:
    'Software con IA para autónomos en España: facturas escaneadas con IA, IVA e IRPF automáticos, nóminas, alquileres y más de 30 modelos fiscales. Plan Básico gratis y prueba PRO de 30 días.',
  keywords: [
    'software autónomos España',
    'programa facturación autónomos',
    'gestión IVA IRPF online',
    'modelo 303 autónomos',
    'nóminas y retenciones',
    'gestoría online con IA',
    'control facturas gastos',
    'MantiGestor',
  ],
  openGraph: {
    title: 'MantiGestor - Gestión inteligente para autónomos con IA',
    description:
      'Fotografía facturas, controla tu IVA e IRPF y prepara la declaración de la renta. Todo en un solo lugar, con inteligencia artificial.',
    siteName: 'MantiGestor',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'MantiGestor - Gestión inteligente para autónomos con IA',
    description:
      'Facturas con IA, IVA e IRPF automáticos y más de 30 modelos fiscales para autónomos en España.',
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MantiGestor',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Gestión fiscal y contable para autónomos',
  operatingSystem: 'Web',
  inLanguage: 'es-ES',
  description:
    'MantiGestor es un software con inteligencia artificial para autónomos españoles: facturas, IVA, IRPF, modelos fiscales, nóminas, alquileres y documentos en un solo lugar.',
  featureList: [
    'Facturas con escaneo por IA',
    'Control de IVA e IRPF',
    'Más de 30 modelos fiscales',
    'Nóminas y retenciones',
    'Gestión de alquileres',
    'Backup de documentos',
  ],
  offers: [
    {
      '@type': 'Offer',
      name: 'Básico',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Plan gratuito para autónomos que empiezan',
    },
    {
      '@type': 'Offer',
      name: 'PRO',
      price: '15',
      priceCurrency: 'EUR',
      description: 'Plan PRO con 30 días de prueba incluida',
    },
  ],
}

export default async function LandingPage() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Nonce de la CSP (generado en middleware): sin él, el navegador bloquearía
  // este script inline en producción (sin 'unsafe-inline' en script-src)
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-xl font-heading font-semibold">
              MantiGestor
            </span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button>Ir al dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/demo">
                  <Button variant="ghost">Probar demo</Button>
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
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="container relative text-center">
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground animate-fade-in">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Ya disponible para autónomos en España
              </div>
              <h1
                className="text-5xl font-heading font-bold tracking-tight sm:text-6xl lg:text-7xl animate-slide-up"
              >
                Gestiona tu actividad como autónomo{' '}
                <span className="text-primary">con IA</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-slide-up-delayed">
                Fotografía facturas, controla tu IVA e IRPF, prepara la declaración
                de la renta y gestiona todo tu negocio. Todo en un solo lugar, con
                inteligencia artificial.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-delayed">
                {user ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="text-base px-8">
                      Ir al dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/register">
                      <Button size="lg" className="text-base px-8">
                        Empieza gratis
                      </Button>
                    </Link>
                    <Link href="/demo">
                      <Button variant="outline" size="lg" className="text-base px-8">
                        Probar demo
                      </Button>
                    </Link>
                    <Link href="/precios">
                      <Button variant="outline" size="lg" className="text-base px-8">
                        Ver precios
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-heading font-bold tracking-tight sm:text-4xl">
              Todo lo que necesitas como autónomo
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Herramientas diseñadas específicamente para autónomos españoles.
              Sin complicaciones, sin conocimientos contables.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="container py-24 bg-muted/30">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-heading font-bold tracking-tight sm:text-4xl">
              Planes simples, sin sorpresas
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Empieza gratis y escala cuando lo necesites.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular
                    ? 'border-primary shadow-lg ring-2 ring-primary'
                    : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                      Más popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-heading font-bold">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check
                          className="h-4 w-4 text-primary shrink-0"
                          aria-hidden="true"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href={plan.href}>{plan.cta}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-heading font-bold tracking-tight sm:text-4xl">
              Lo que dicen nuestros usuarios
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Autónomos reales que ya confían en MantiGestor.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="flex flex-col">
                <CardContent className="flex-1 pt-6">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-primary text-primary"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </CardContent>
                <div className="border-t px-6 py-4">
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-heading font-bold tracking-tight sm:text-4xl">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="mx-auto max-w-3xl space-y-4">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-lg border bg-card p-4 [&_summary]:cursor-pointer"
              >
                <summary className="flex items-center justify-between font-medium text-sm">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="container py-24 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-heading font-bold tracking-tight sm:text-4xl">
              ¿Listo para simplificar tu fiscalidad?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Únete a miles de autónomos que ya gestionan su negocio con
              MantiGestor. Empieza gratis, sin tarjeta de crédito.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="text-base px-8">
                    Ir al dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="text-base px-8">
                      Empieza gratis
                    </Button>
                  </Link>
                  <Link href="/precios">
                    <Button variant="outline" size="lg" className="text-base px-8">
                      Ver precios
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} MantiGestor. Todos los derechos
          reservados.
        </div>
      </footer>
    </div>
  )
}
