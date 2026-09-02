import type { PagoRecurrente } from './pagos-recurrentes'

export interface FacturaCalendario {
  emisorReceptor: string | null
  total: number
  numero: string | null
  fechaVencimiento: string | null
  estado: string
}

export interface EventoCalendario {
  titulo: string
  fechaInicio: Date
  fechaFin: Date
  descripcion: string
  color: string
}

const COLORES = {
  vencimiento: '#ef4444',
  fiscal: '#f59e0b',
  recurrente: '#3b82f6',
  iva: '#10b981',
  irpf: '#8b5cf6',
  otros: '#6b7280',
}

function esDeTipo(modelo: string | null, ...tipos: string[]): boolean {
  if (!modelo) return false
  const m = modelo.toLowerCase()
  return tipos.some(t => m.includes(t))
}

export function eventosVencimientosFacturas(facturas: FacturaCalendario[]): EventoCalendario[] {
  return facturas
    .filter(f => f.fechaVencimiento && f.estado !== 'pagada')
    .map(f => {
      const fecha = new Date(f.fechaVencimiento!)
      const titulo = `Vencimiento: ${f.emisorReceptor || 'Factura'} — ${f.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`
      return {
        titulo,
        fechaInicio: fecha,
        fechaFin: fecha,
        descripcion: `Factura ${f.numero || 'sin número'}\nImporte: ${f.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\nCliente: ${f.emisorReceptor || 'N/A'}`,
        color: COLORES.vencimiento,
      }
    })
}

export function eventosCalendarioFiscal(plazos: Array<{ modeloNumero: string | null; periodo: string; fechaLimiteReferencia: Date | string | null }>, anyo: number): EventoCalendario[] {
  return plazos
    .filter(p => {
      const fecha = p.fechaLimiteReferencia instanceof Date
        ? p.fechaLimiteReferencia
        : p.fechaLimiteReferencia ? new Date(p.fechaLimiteReferencia) : null
      return fecha && fecha.getFullYear() === anyo
    })
    .map(p => {
      const fecha = p.fechaLimiteReferencia instanceof Date
        ? p.fechaLimiteReferencia
        : new Date(p.fechaLimiteReferencia!)

      const modelo = p.modeloNumero || 'Modelo'
      const titulo = `Plazo fiscal: Modelo ${modelo} — ${p.periodo}`

      const color = esDeTipo(modelo, '303', '309', '349', '390')
        ? COLORES.iva
        : esDeTipo(modelo, '100', '130', '131', '111', '115', '123')
          ? COLORES.irpf
          : COLORES.fiscal

      return {
        titulo,
        fechaInicio: fecha,
        fechaFin: fecha,
        descripcion: `Modelo ${modelo}\nPeriodo: ${p.periodo}\nFecha límite: ${fecha.toLocaleDateString('es-ES')}`,
        color,
      }
    })
}

export function eventosPagosRecurrentes(pagos: PagoRecurrente[], anyo: number, mes?: number): EventoCalendario[] {
  const eventos: EventoCalendario[] = []
  const meses = mes !== undefined ? [mes] : Array.from({ length: 12 }, (_, i) => i)

  for (const pago of pagos.filter(p => p.activo)) {
    for (const m of meses) {
      const diasEnMes = new Date(anyo, m + 1, 0).getDate()
      const dia = Math.min(pago.dia_pago, diasEnMes)
      const fecha = new Date(anyo, m, dia)

      eventos.push({
        titulo: `Pago: ${pago.concepto} — ${pago.importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`,
        fechaInicio: fecha,
        fechaFin: fecha,
        descripcion: `Concepto: ${pago.concepto}\nImporte: ${pago.importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}\nCategoría: ${pago.categoria}${pago.notas ? `\nNotas: ${pago.notas}` : ''}`,
        color: COLORES.recurrente,
      })
    }
  }

  return eventos
}

function formatoFechaICS(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function escapeICS(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function generarICS(eventos: EventoCalendario[]): string {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MantiGestor//Google Calendar Export//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const evento of eventos) {
    const uid = crypto.randomUUID()
    const ahora = new Date()
    const dtstamp = `${formatoFechaICS(ahora)}T${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}${String(ahora.getSeconds()).padStart(2, '0')}Z`

    const fechaFin = new Date(evento.fechaFin)
    fechaFin.setDate(fechaFin.getDate() + 1)

    lineas.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${formatoFechaICS(evento.fechaInicio)}`,
      `DTEND;VALUE=DATE:${formatoFechaICS(fechaFin)}`,
      `SUMMARY:${escapeICS(evento.titulo)}`,
      `DESCRIPTION:${escapeICS(evento.descripcion)}`,
      `COLOR:${evento.color}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }

  lineas.push('END:VCALENDAR')
  return lineas.join('\r\n')
}

export function descargarICS(eventos: EventoCalendario[], nombre: string): void {
  const contenido = generarICS(eventos)
  const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${nombre.replace(/[^a-zA-Z0-9-_]/g, '_')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
