'use client'

import { MOEDAS, type Moneda } from '@/lib/divisas'

interface SelectorMonedaProps {
  value: string
  onChange: (code: string) => void
  id?: string
  disabled?: boolean
  className?: string
}

export function SelectorMoneda({ value, onChange, id, disabled, className }: SelectorMonedaProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className ?? 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'}
    >
      {MOEDAS.map((m: Moneda) => (
        <option key={m.code} value={m.code}>
          {m.symbol} — {m.name} ({m.code})
        </option>
      ))}
    </select>
  )
}
