import type { Metadata } from 'next'
import AjustesPage from './page-client'

export const metadata: Metadata = {
  title: 'Ajustes - MantiGestor',
  description: 'Configuración de tu cuenta y preferencias',
}

export default function Page() {
  return <AjustesPage />
}
