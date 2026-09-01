export interface Tag {
  id: string
  nombre: string
  color: string
}

export const TAGS_PREDEFINIDOS: Tag[] = [
  { id: 'marketing', nombre: 'Marketing', color: '#ec4899' },
  { id: 'oficina', nombre: 'Oficina', color: '#8b5cf6' },
  { id: 'software', nombre: 'Software', color: '#3b82f6' },
  { id: 'hardware', nombre: 'Hardware', color: '#6366f1' },
  { id: 'transporte', nombre: 'Transporte', color: '#f97316' },
  { id: 'alimentacion', nombre: 'Alimentación', color: '#22c55e' },
  { id: 'servicios', nombre: 'Servicios', color: '#14b8a6' },
  { id: 'legal', nombre: 'Legal', color: '#ef4444' },
  { id: 'contabilidad', nombre: 'Contabilidad', color: '#a855f7' },
  { id: 'nomina', nombre: 'Nómina', color: '#06b6d4' },
  { id: 'alquiler', nombre: 'Alquiler', color: '#eab308' },
  { id: 'otros', nombre: 'Otros', color: '#6b7280' },
]

const CUSTOM_COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#818cf8', '#fb923c', '#4ade80', '#2dd4bf', '#f87171', '#c084fc', '#22d3ee', '#facc15', '#9ca3af']

export function obtenerColorTag(tagId: string): string {
  const predefinido = TAGS_PREDEFINIDOS.find(t => t.id === tagId)
  if (predefinido) return predefinido.color
  const idx = Math.abs(hashString(tagId)) % CUSTOM_COLORS.length
  return CUSTOM_COLORS[idx]!
}

export function formatearTags(tags: string | null | undefined): string {
  if (!tags) return ''
  return tags.split(',').map(t => t.trim()).filter(Boolean).join(', ')
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

export function parsearTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

export function serializarTags(tags: string[]): string {
  return tags.filter(Boolean).join(',')
}

export function obtenerNombreTag(tagId: string): string {
  const predefinido = TAGS_PREDEFINIDOS.find(t => t.id === tagId)
  if (predefinido) return predefinido.nombre
  return tagId
}
