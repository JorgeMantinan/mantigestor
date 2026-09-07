import type { Metadata } from 'next'
import RentaPage from './page-client'

export const metadata: Metadata = {
  title: 'Renta - MantiGestor',
  description: 'Declaración de la renta anual',
}

export default function Page() {
  return <RentaPage />
}
