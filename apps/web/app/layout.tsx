import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import { Providers } from '@/components/providers'
import '@/styles/globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MantiGestor - Gestión inteligente para autónomos',
  description:
    'SaaS con IA para autónomos españoles. Gestiona facturas, IVA, IRPF, alumnos y más.',
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
