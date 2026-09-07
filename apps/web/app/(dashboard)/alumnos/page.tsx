import type { Metadata } from 'next'
import AlumnosPage from './page-client'

export const metadata: Metadata = {
  title: 'Alumnos - MantiGestor',
  description: 'Gestión de alumnos y exámenes',
}

export default function Page() {
  return <AlumnosPage />
}
