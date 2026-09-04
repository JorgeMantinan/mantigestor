'use client'

const STORAGE_KEY = 'mantigestor_plantillas_email'

export interface PlantillaEmail {
  id: string
  nombre: string
  asunto: string
  cuerpo: string
  idioma: 'es' | 'en'
}

interface PerfilEmail {
  nombre: string | null
  empresa_nombre: string | null
}

interface FacturaData {
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  tipo: string
}

export const PLACEHOLDERS_EMAIL = [
  '{numero}',
  '{fecha}',
  '{total}',
  '{cliente}',
  '{empresa}',
  '{base_imponible}',
  '{iva}',
] as const

export const PLACEHOLDER_DESCRIPTIONS: Record<string, string> = {
  '{numero}': 'Nº de factura',
  '{fecha}': 'Fecha de emisión',
  '{total}': 'Total de la factura',
  '{cliente}': 'Nombre del cliente/proveedor',
  '{empresa}': 'Nombre de tu empresa',
  '{base_imponible}': 'Base imponible',
  '{iva}': 'Porcentaje de IVA',
}

export const PLANTILLAS_PREDEFINIDAS: PlantillaEmail[] = [
  {
    id: 'envio-factura',
    nombre: 'Envío de factura',
    asunto: 'Factura {numero} — {empresa}',
    cuerpo: `Estimado/a {cliente}:

Adjunto le enviamos la factura nº {numero}, con fecha {fecha}.

Concepto:
- Base imponible: {base_imponible}
- IVA ({iva}%): {total}

Le rogamos que efectúe el pago en un plazo máximo de 30 días naturales.

Si tiene cualquier duda, no dude en ponerse en contacto con nosotros.

Un saludo cordial,
{empresa}`,
    idioma: 'es',
  },
  {
    id: 'recordatorio-pago',
    nombre: 'Recordatorio de pago',
    asunto: 'Recordatorio — Factura {numero} pendiente de pago',
    cuerpo: `Estimado/a {cliente}:

Le recordamos que la factura nº {numero}, con fecha {fecha}, sigue pendiente de pago.

Importe total: {total}

Le agradeceríamos que pudiera regularizar esta situación a la mayor brevedad posible.

Si ya ha realizado el pago, por favor disculpe las molestias y considere este mensaje como cancelado.

Un saludo cordial,
{empresa}`,
    idioma: 'es',
  },
  {
    id: 'agradecimiento',
    nombre: 'Agradecimiento',
    asunto: 'Gracias por su pago — Factura {numero}',
    cuerpo: `Estimado/a {cliente}:

Hemos recibido su pago correspondiente a la factura nº {numero} por un importe de {total}.

Le confirmamos que su cuenta está al corriente de pago.

Agradecemos su confianza y quedamos a su disposición para cualquier consulta futura.

Un saludo cordial,
{empresa}`,
    idioma: 'es',
  },
]

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function renderPlantilla(
  plantilla: PlantillaEmail,
  factura: FacturaData,
  perfil: PerfilEmail
): { asunto: string; cuerpo: string } {
  const empresa = perfil.empresa_nombre || perfil.nombre || 'Mi Empresa'
  const cliente = factura.emisorReceptor

  const reemplazos: Record<string, string> = {
    '{numero}': factura.numero,
    '{fecha}': formatFecha(factura.fechaEmision),
    '{total}': formatEuro(factura.total),
    '{cliente}': cliente,
    '{empresa}': empresa,
    '{base_imponible}': formatEuro(factura.baseImponible),
    '{iva}': String(factura.iva),
  }

  let asunto = plantilla.asunto
  let cuerpo = plantilla.cuerpo

  for (const [placeholder, valor] of Object.entries(reemplazos)) {
    asunto = asunto.replaceAll(placeholder, valor)
    cuerpo = cuerpo.replaceAll(placeholder, valor)
  }

  return { asunto, cuerpo }
}

export function obtenerPlantillas(): PlantillaEmail[] {
  if (typeof window === 'undefined') return PLANTILLAS_PREDEFINIDAS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return PLANTILLAS_PREDEFINIDAS
    const guardadas = JSON.parse(raw) as PlantillaEmail[]
    return [...PLANTILLAS_PREDEFINIDAS, ...guardadas.filter(p => !PLANTILLAS_PREDEFINIDAS.some(pre => pre.id === p.id))]
  } catch {
    return PLANTILLAS_PREDEFINIDAS
  }
}

export function guardarPlantilla(plantilla: PlantillaEmail): void {
  const actuales = obtenerPlantillas().filter(p => !PLANTILLAS_PREDEFINIDAS.some(pre => pre.id === p.id))
  const existe = actuales.findIndex(p => p.id === plantilla.id)
  if (existe >= 0) {
    actuales[existe] = plantilla
  } else {
    actuales.push(plantilla)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actuales))
}

export function eliminarPlantilla(id: string): void {
  if (PLANTILLAS_PREDEFINIDAS.some(p => p.id === id)) return
  const actuales = obtenerPlantillas().filter(p => !PLANTILLAS_PREDEFINIDAS.some(pre => pre.id === p.id))
  const filtradas = actuales.filter(p => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtradas))
}

export function esPlantillaPredefinida(id: string): boolean {
  return PLANTILLAS_PREDEFINIDAS.some(p => p.id === id)
}

export function generarIdPlantilla(): string {
  return `plantilla-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
