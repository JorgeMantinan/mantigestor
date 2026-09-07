import type { Metadata } from 'next'
import FiscalPage from './page-client'

export const metadata: Metadata = {
  title: 'Fiscal - MantiGestor',
  description: 'Calculadoras fiscales y modelos impositivos',
}

export default function Page() {
  return <FiscalPage />
}
