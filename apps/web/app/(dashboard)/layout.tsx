import type { Metadata } from 'next'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { FiscalRemindersProvider } from '@/components/layout/FiscalRemindersProvider'
import { DashboardShortcuts } from '@/components/layout/DashboardShortcuts'
import { PersonaActivaProvider } from '@/contexts/persona-activa-context'
import { CommandPalette } from '@/components/command-palette'

export const metadata: Metadata = {
  title: 'Panel - MantiGestor',
  description: 'Gestión inteligente para autónomos españoles.',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PersonaActivaProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <FiscalRemindersProvider>{children}</FiscalRemindersProvider>
          </main>
        </div>
        <DashboardShortcuts />
        <CommandPalette />
      </div>
    </PersonaActivaProvider>
  )
}
