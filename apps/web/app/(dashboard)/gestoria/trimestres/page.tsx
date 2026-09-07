import type { Metadata } from 'next'
import TrimestresPage from './page-client'

export const metadata: Metadata = {
  title: 'Trimestres - MantiGestor',
  description: 'Declaración trimestral de IVA y retenciones',
}

export default function Page() {
  return <TrimestresPage />
}
