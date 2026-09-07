import type { Metadata } from 'next'
import NominasPage from './page-client'

export const metadata: Metadata = {
  title: 'Nóminas - MantiGestor',
  description: 'Gestión de nóminas y retenciones IRPF',
}

export default function Page() {
  return <NominasPage />
}
