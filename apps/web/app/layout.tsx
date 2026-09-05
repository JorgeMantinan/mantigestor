import type { Metadata, Viewport } from 'next'
import { Roboto } from 'next/font/google'
import { Providers } from '@/components/providers'
import '@/styles/globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})

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
    'SaaS con IA para autónomos españoles. Gestiona facturas, IVA, IRPF, nóminas, alumnos y más.',
  keywords: ['autónomos', 'facturas', 'gestoría', 'IVA', 'IRPF', 'nóminas', 'alumnos', 'España', 'IA'],
  openGraph: {
    title: 'MantiGestor - Gestión inteligente para autónomos',
    description:
      'SaaS con IA para autónomos españoles. Gestiona facturas, IVA, IRPF, nóminas, alumnos y más.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
