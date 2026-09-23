import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description:
    'Accede a tu cuenta de MantiGestor y continúa gestionando tus facturas, IVA, IRPF, nóminas y modelos fiscales.',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
