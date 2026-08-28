import { ExpedientePageClient } from './page-client'

export const metadata = {
  title: 'Expediente por cliente',
  description: 'Foto fiscal completa de un perfil: obligaciones, vencimientos, KPIs y facturas del año.',
}

export default function ExpedientePage() {
  return <ExpedientePageClient />
}
