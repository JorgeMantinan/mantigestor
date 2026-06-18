import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'MantiGestor - Gestión inteligente para autónomos',
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-xl font-heading font-semibold">MantiGestor</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/register">
              <Button>Crear cuenta</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-24 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-heading font-bold tracking-tight sm:text-6xl">
            Gestiona tu actividad como autónomo{' '}
            <span className="text-primary">con IA</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Fotografía facturas, controla tu IVA e IRPF, prepara la declaración de la renta
            y gestiona tus alumnos. Todo en un solo lugar, con inteligencia artificial.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Empezar gratis</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">Iniciar sesión</Button>
            </Link>
          </div>
        </section>

        <section className="container py-24">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Facturas con IA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Fotografía cualquier factura o ticket, incluso manuscrito, y la IA extrae
                  los datos automáticamente.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Control fiscal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Modelo 303, 130 y declaración de la renta. Cálculos automáticos con
                  alertas de vencimientos.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Módulo alumnos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sube apuntes y genera resúmenes, exámenes y preguntas con IA para tus
                  estudiantes.
                </p>
              </CardContent>
            </Card>
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
