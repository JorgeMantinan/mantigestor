import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description:
    'Regístrate gratis en MantiGestor y empieza a gestionar tus facturas, IVA, IRPF y modelos fiscales con inteligencia artificial.',
  robots: { index: false, follow: false },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
