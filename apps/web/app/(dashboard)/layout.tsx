import type { Metadata } from 'next'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { FiscalRemindersProvider } from '@/components/layout/FiscalRemindersProvider'
import { DashboardShortcuts } from '@/components/layout/DashboardShortcuts'
import { PersonaActivaProvider } from '@/contexts/persona-activa-context'
import dynamic from 'next/dynamic'

const CommandPalette = dynamic(() => import('@/components/command-palette').then(m => m.CommandPalette), { ssr: false })
const HelpDialog = dynamic(() => import('@/components/help-dialog').then(m => m.HelpDialog), { ssr: false })
const MilestoneProvider = dynamic(() => import('@/components/milestone-provider').then(m => m.MilestoneProvider), { ssr: false })

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
        <HelpDialog />
        <MilestoneProvider />
      </div>
    </PersonaActivaProvider>
  )
}
