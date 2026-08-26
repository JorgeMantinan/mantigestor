'use client'

import { useFiscalReminders } from '@/hooks/use-fiscal-reminders'

export function FiscalRemindersProvider({ children }: { children: React.ReactNode }) {
  useFiscalReminders()
  return <>{children}</>
}
