import { PackAnualPageClient } from './page-client'

export const metadata = {
  title: 'Pack anual consolidado',
  description: 'Resumen consolidado del año fiscal: facturas, IVA, IRPF, modelos y próximos plazos.',
}

export default function PackAnualPage() {
  return <PackAnualPageClient />
}
