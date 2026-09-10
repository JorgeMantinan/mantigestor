export interface PendingInvoice {
  id: string
  numero: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string
  fechaEmision: string
  fechaVencimiento: string | null
  baseImponible: number
  iva: number
  total: number
  estado: string
  categoriaGasto: string | null
  notas: string | null
  pdfUrl: string | null
  moneda: string
  tipoCambio: number
  descuentoPorcentaje: number
  empresaId: string | null
  perfilId: string
  createdAt: string
}

const STORAGE_KEY = 'mantigestor_pending_invoices'

export function getPendingInvoices(): PendingInvoice[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePendingInvoice(invoice: PendingInvoice): void {
  if (typeof window === 'undefined') return
  const pending = getPendingInvoices()
  pending.push(invoice)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
  window.dispatchEvent(new Event('offline-invoices-changed'))
}

export function removePendingInvoice(id: string): void {
  if (typeof window === 'undefined') return
  const pending = getPendingInvoices().filter(inv => inv.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
  window.dispatchEvent(new Event('offline-invoices-changed'))
}

export function clearPendingInvoices(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event('offline-invoices-changed'))
}

export function getPendingCount(): number {
  return getPendingInvoices().length
}
