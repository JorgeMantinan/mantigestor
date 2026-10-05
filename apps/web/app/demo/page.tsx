import type { Metadata } from 'next'
import DemoInicio from './demo-client'

export const metadata: Metadata = {
  title: 'Prueba la demo - MantiGestor',
  description: 'Explora MantiGestor con datos de ejemplo de una autónoma: facturas, IVA, nóminas y alquileres.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <DemoInicio />
}