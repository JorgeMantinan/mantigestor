'use client'

import { ThemeProvider } from 'next-themes'
import { LanguageProvider } from '@/contexts/language-context'
import { RegisterSW } from '@/components/register-sw'
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider'
import { OfflineIndicator } from '@/components/offline-indicator'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <RegisterSW />
        <OfflineIndicator />
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
