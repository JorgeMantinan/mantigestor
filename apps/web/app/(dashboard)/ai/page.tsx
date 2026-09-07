import type { Metadata } from 'next'
import AIPage from './page-client'

export const metadata: Metadata = {
  title: 'Asistente IA - MantiGestor',
  description: 'Asistente inteligente para consultas fiscales y contables',
}

export default function Page() {
  return <AIPage />
}
