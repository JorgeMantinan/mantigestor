import type { Metadata } from 'next'
import AlquilerPage from './page-client'

export const metadata: Metadata = {
  title: 'Alquiler - MantiGestor',
  description: 'Gestión de propiedades e ingresos de alquiler',
}

export default function Page() {
  return <AlquilerPage />
}
