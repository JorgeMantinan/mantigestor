'use client'

import { ThemeProvider } from 'next-themes'
import { LanguageProvider } from '@/contexts/language-context'
import { RegisterSW } from '@/components/register-sw'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { OfflineIndicator } from '@/components/offline-indicator'
import { ChunkErrorRecovery } from '@/components/chunk-error-recovery'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <RegisterSW />
        <ChunkErrorRecovery />
        <OfflineIndicator />
        <OnboardingProvider>
          {/* Provider global de tooltips: cualquier componente (sidebar, header...) puede usar Tooltip */}
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </OnboardingProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
