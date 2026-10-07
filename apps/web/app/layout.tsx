import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Roboto } from 'next/font/google'
import { Providers } from '@/components/providers'
import '@/styles/globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})

// La CSP con nonce (middleware) exige render dinámico: un HTML pre-renderizado
// en build no llevaría el nonce de la petición y todos sus scripts quedarían
// bloqueados. Aplica a todas las rutas hijas (inheritencia de segmento).
export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f59e0b',
}

export const metadata: Metadata = {
  title: {
    default: 'MantiGestor - Gestión inteligente para autónomos',
    template: '%s | MantiGestor',
  },
  description:
    'SaaS con IA para autónomos españoles. Gestiona facturas, IVA, IRPF, nóminas y más.',
  keywords: ['autónomos', 'facturas', 'gestoría', 'IVA', 'IRPF', 'nóminas', 'España', 'IA'],
  openGraph: {
    title: 'MantiGestor - Gestión inteligente para autónomos',
    description:
      'SaaS con IA para autónomos españoles. Gestiona facturas, IVA, IRPF, nóminas y más.',
    locale: 'es_ES',
    type: 'website',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon.svg',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Nonce de la CSP para el script inline de next-themes (ThemeProvider no
  // lo firma Next automáticamente porque lo emite JSX, no el runtime)
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  )
}
