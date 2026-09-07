import type { Metadata } from 'next'
import DashboardPage from './page-client'

export const metadata: Metadata = {
  title: 'Dashboard - MantiGestor',
  description: 'Panel principal de gestión fiscal y contable',
}

export default function Page() {
  return <DashboardPage />
}
