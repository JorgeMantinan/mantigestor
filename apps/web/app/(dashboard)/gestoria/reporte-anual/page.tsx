import { ReporteAnualPageClient } from './page-client'

export const metadata = {
  title: 'Reporte anual - MantiGestor',
  description: 'Reporte anual fiscal completo con resumen, desglose mensual, categorías, IVA por trimestre y ratios financieros.',
}

export default function ReporteAnualPage() {
  return <ReporteAnualPageClient />
}
