'use client'

import { ThemeProvider } from 'next-themes'
import { LanguageProvider } from '@/contexts/language-context'
import { RegisterSW } from '@/components/register-sw'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { OfflineIndicator } from '@/components/offline-indicator'
import { ChunkErrorRecovery } from '@/components/chunk-error-recovery'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange nonce={nonce}>
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
