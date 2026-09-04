import { ReporteAsesoriaPageClient } from './page-client'

export const metadata = {
  title: 'Informe de asesoría - MantiGestor',
  description: 'Informe fiscal completo para asesoría: IVA por trimestre, retenciones, modelos presentados, pagos fraccionados y anexos.',
}

export default function ReporteAsesoriaPage() {
  return <ReporteAsesoriaPageClient />
}
