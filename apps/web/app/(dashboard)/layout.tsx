import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { FiscalRemindersProvider } from '@/components/layout/FiscalRemindersProvider'
import { DashboardShortcuts } from '@/components/layout/DashboardShortcuts'
import { PersonaActivaProvider } from '@/contexts/persona-activa-context'
import { EmpresaActivaProvider } from '@/contexts/empresa-activa-context'
import { GestionandoBanner } from '@/components/layout/gestionando-banner'
import { ContextualChat } from '@/components/ai/contextual-chat'
import dynamic from 'next/dynamic'

const HelpDialog = dynamic(() => import('@/components/help-dialog').then(m => m.HelpDialog), { ssr: false })
const MilestoneProvider = dynamic(() => import('@/components/milestone-provider').then(m => m.MilestoneProvider), { ssr: false })

export const metadata: Metadata = {
  title: 'Panel - MantiGestor',
  description: 'Gestión inteligente para autónomos españoles.',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Segunda barrera de sesión (el middleware solo hace redirect de UX con un
  // JWT no verificado): aquí se valida contra Supabase de verdad.
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PersonaActivaProvider>
      <EmpresaActivaProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <GestionandoBanner />
            <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-0">
              <FiscalRemindersProvider>{children}</FiscalRemindersProvider>
            </main>
          </div>
          <DashboardShortcuts />
          <ContextualChat />
          <HelpDialog />
          <MilestoneProvider />
        </div>
      </EmpresaActivaProvider>
    </PersonaActivaProvider>
  )
}
