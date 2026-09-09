export type TriggerTipo = 'umbral_gasto' | 'fecha_especifica' | 'saldo_bajo'

export interface TriggerConfig {
  triggerTipo: TriggerTipo | null
  triggerValor: number | null
}

export interface Attachment {
  nombre: string
  url: string
}

export interface NotasData {
  triggerTipo?: TriggerTipo | null
  triggerValor?: number | null
  attachments?: Attachment[]
}

export interface FacturaRecurrente {
  id: string
  tipo: string
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  iva: number
  diaGeneracion: number
  diaEmail: number | null
  activa: boolean
  ultimaGeneracion: string | null
  createdAt: string
  notas: string | null
}

export interface PerfilEmpresa {
  nombre: string | null
  empresa_nombre: string | null
  empresa_nif: string | null
  empresa_direccion: string | null
  notasPie: string | null
  logoBase64: string | null
  firmaBase64: string | null
  idiomaFactura: string | null
}

export function parseNotasData(notas: string | null): NotasData {
  if (!notas) return {}
  try {
    return JSON.parse(notas) as NotasData
  } catch { return {} }
}

export function serializarNotasData(data: NotasData): string {
  return JSON.stringify(data)
}

export function parseTriggerConfig(notas: string | null): TriggerConfig {
  const data = parseNotasData(notas)
  if (data.triggerTipo && ['umbral_gasto', 'fecha_especifica', 'saldo_bajo'].includes(data.triggerTipo)) {
    return { triggerTipo: data.triggerTipo, triggerValor: data.triggerValor ?? null }
  }
  return { triggerTipo: null, triggerValor: null }
}

export function parseAttachments(notas: string | null): Attachment[] {
  return parseNotasData(notas).attachments ?? []
}

export function serializarNotasConAttachments(notas: string | null, attachments: Attachment[]): string {
  const data = parseNotasData(notas)
  data.attachments = attachments
  return serializarNotasData(data)
}
