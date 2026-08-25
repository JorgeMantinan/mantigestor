import type {
  EscalaIrpf,
  TramoIrpf,
  TramoReta,
  PlazoFiscalEntrada,
} from '@mantigestor/utils'
import type { ReglaIva, TipoIs, MinimoFamiliar, ReduccionIrpf } from '@/lib/fiscal/datos'

export interface DatosFiscales {
  taxYear: number
  regimen: string
  escalaEstatal: EscalaIrpf | null
  escalaAutonomica: EscalaIrpf | null
  escalaAhorroForal: EscalaIrpf | null
  reglasIva: ReglaIva[]
  tramosReta: TramoReta[]
  tiposIs: TipoIs[]
  escalaPatrimonio: TramoIrpf[]
  minimos: MinimoFamiliar[]
  reducciones: ReduccionIrpf[]
  plazos: PlazoFiscalEntrada[]
}

export const eur = (centimos: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(centimos / 100)

export function parseEuros(valor: string): number | null {
  if (!valor.trim()) return null
  const n = parseFloat(valor.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}
