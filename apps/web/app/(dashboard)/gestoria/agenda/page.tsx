import { AgendaPageClient } from './page-client'

export const metadata = {
  title: 'Agenda del gestor',
  description: 'Calendario mensual con vencimientos fiscales de todos los clientes gestionados.',
}

export default function AgendaPage() {
  return <AgendaPageClient />
}
