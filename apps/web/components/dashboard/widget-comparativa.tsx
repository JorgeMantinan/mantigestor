'use client'

import { ComparativaSector } from '@/components/comparativa-sector'

interface Factura {
  tipo: string
  baseImponible: number
  iva: number
  total: number
}

export function WidgetComparativa({ facturas }: { facturas: Factura[] }) {
  return <ComparativaSector facturas={facturas} />
}
