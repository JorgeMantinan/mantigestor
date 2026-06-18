import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MantiGestor - Gestión inteligente para autónomos',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
