import { ImportarExtractoPageClient } from './page-client'

export const metadata = {
  title: 'Importar extracto bancario',
  description: 'Importa extractos CSV de tu banco para clasificar automáticamente ingresos y gastos.',
}

export default function ImportarExtractoPage() {
  return <ImportarExtractoPageClient />
}
