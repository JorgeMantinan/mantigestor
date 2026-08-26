import type {
  EscalaIrpf,
  TramoIrpf,
  TramoReta,
  PlazoFiscalEntrada,
} from '@mantigestor/utils'
import type { ReglaIva, TipoIs, MinimoFamiliar, ReduccionIrpf, DeduccionAutonomica, BonificacionPatrimonio } from '@/lib/fiscal/datos'

export interface DatosFiscales {
  taxYear: number
  regimen: string
  escalaEstatal: EscalaIrpf | null
  escalaAutonomica: EscalaIrpf | null
  escalaAhorroForal: EscalaIrpf | null
  reglasIva: ReglaIva[]
  tramosReta: TramoReta[]
  cotizacionRetaPct: number | null
  deduccionesAutonomicas: DeduccionAutonomica[]
  tiposIs: TipoIs[]
  escalaPatrimonioEstatal: TramoIrpf[]
  escalaPatrimonioAutonomica: TramoIrpf[] | null
  comunidadPatrimonio: string | null
  bonificacionesPatrimonio: BonificacionPatrimonio[]
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
