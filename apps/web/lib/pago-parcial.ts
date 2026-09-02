export interface PagoParcial {
  id: string
  fecha: string
  importe: number
  metodo: string
  notas: string
}

export const METODOS_PAGO = ['transferencia', 'efectivo', 'tarjeta', 'bizum', 'otro'] as const

export function obtenerPagos(pagosStr: string | null): PagoParcial[] {
  if (!pagosStr) return []
  try { return JSON.parse(pagosStr) } catch { return [] }
}

export function calcularSaldoPendiente(total: number, pagosStr: string | null): number {
  const pagos = obtenerPagos(pagosStr)
  const pagado = pagos.reduce((s, p) => s + p.importe, 0)
  return Math.max(0, total - pagado)
}

export function estaPagada(total: number, pagosStr: string | null): boolean {
  return calcularSaldoPendiente(total, pagosStr) <= 0
}

export function registrarPago(importe: number, metodo: string, notas: string, pagosActuales: string | null): string {
  const pagos = obtenerPagos(pagosActuales)
  pagos.push({
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    importe,
    metodo,
    notas,
  })
  return JSON.stringify(pagos)
}
