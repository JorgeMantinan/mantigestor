'use client'

import { useFiscalReminders } from '@/hooks/use-fiscal-reminders'
import { useRecurringInvoiceCheck } from '@/hooks/use-recurring-invoice-check'

export function FiscalRemindersProvider({ children }: { children: React.ReactNode }) {
  useFiscalReminders()
  useRecurringInvoiceCheck()
  return <>{children}</>
}
