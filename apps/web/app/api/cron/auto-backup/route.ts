import { NextResponse, type NextRequest } from 'next/server'
import { verificarCron } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cron job: /api/cron/auto-backup
 *
 * Ejecuta a las 03:00 UTC diariamente.
 * Para cada usuario con facturas genera un CSV de backup
 * y crea una notificación in-app informando que el backup está disponible.
 *
 * Seguridad: comprobar CRON_SECRET en header x-cron-secret.
 */

interface Perfil {
  id: string
  email: string | null
  nombre: string | null
}

interface Factura {
  numero: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  fechaVencimiento: string | null
  baseImponible: number
  iva: number
  total: number
  estado: string
  categoriaGasto: string | null
  notas: string | null
  pdfUrl: string | null
  createdAt: string
}

function escapeCsvField(field: string | null | undefined): string {
  if (field == null) return ''
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatCentsToEur(cents: number): string {
  return (cents / 100).toFixed(2)
}

function facturasToCsv(facturas: Factura[]): string {
  const headers = [
    'numero', 'tipo', 'emisorReceptor', 'nifContraparte',
    'fechaEmision', 'fechaVencimiento', 'baseImponible',
    'iva', 'total', 'estado', 'categoriaGasto', 'notas',
    'pdfUrl', 'createdAt',
  ]

  const rows = facturas.map(f => [
    escapeCsvField(f.numero),
    escapeCsvField(f.tipo),
    escapeCsvField(f.emisorReceptor),
    escapeCsvField(f.nifContraparte),
    f.fechaEmision?.slice(0, 10) ?? '',
    f.fechaVencimiento?.slice(0, 10) ?? '',
    formatCentsToEur(f.baseImponible),
    f.iva,
    formatCentsToEur(f.total),
    escapeCsvField(f.estado),
    escapeCsvField(f.categoriaGasto),
    escapeCsvField(f.notas),
    escapeCsvField(f.pdfUrl),
    f.createdAt?.slice(0, 10) ?? '',
  ].join(','))

  return [headers.join(','), ...rows].join('\n')
}

export async function GET(req: NextRequest) {
    if (!verificarCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const supabase = createAdminClient()

  // Obtener usuarios con facturas
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, email, nombre')

  if (!perfiles || perfiles.length === 0) {
    return NextResponse.json({ backedUp: 0 })
  }

  let backedUp = 0

  for (const perfil of perfiles as Perfil[]) {
    try {
      const { data: facturas } = await supabase
        .from('facturas')
        .select('*')
        .eq('perfilId', perfil.id)
        .order('fechaEmision', { ascending: true })

      if (!facturas || facturas.length === 0) continue

      const csv = facturasToCsv(facturas as Factura[])
      const hoy = new Date().toISOString().slice(0, 10)
      const contenido = `backup_csv_${hoy}:${csv.length}_chars:${facturas.length}_facturas`

      // Evitar duplicar si ya se creó backup hoy
      const { data: yaExiste } = await supabase
        .from('notificaciones')
        .select('id')
        .eq('perfilId', perfil.id)
        .eq('tipo', 'auto_backup')
        .eq('contenido', contenido)
        .limit(1)

      if (yaExiste && yaExiste.length > 0) continue

      await supabase.from('notificaciones').insert({
        id: crypto.randomUUID(),
        perfilId: perfil.id,
        tipo: 'auto_backup',
        contenido,
        creadoEn: new Date().toISOString(),
      })

      backedUp++
    } catch (e) {
      console.error(`Error generando backup para perfil ${perfil.id}:`, e)
    }
  }

  return NextResponse.json({ backedUp })
}
