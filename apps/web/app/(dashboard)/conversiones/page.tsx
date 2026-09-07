import type { Metadata } from 'next'
import ConversionesPage from './page-client'

export const metadata: Metadata = {
  title: 'Conversiones - MantiGestor',
  description: 'Conversión de divisas y tipos de cambio',
}

export default function Page() {
  return <ConversionesPage />
}
