import { NextResponse, type NextRequest } from 'next/server'
import { verificarCron } from '@/lib/cron-auth'
import { mapConcurrente } from '@/lib/concurrency'
import { celdaCsv } from '@/lib/csv-seguro'
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


export const maxDuration = 300
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
    celdaCsv(f.numero),
    celdaCsv(f.tipo),
    celdaCsv(f.emisorReceptor),
    celdaCsv(f.nifContraparte),
    f.fechaEmision?.slice(0, 10) ?? '',
    f.fechaVencimiento?.slice(0, 10) ?? '',
    formatCentsToEur(f.baseImponible),
    f.iva,
    formatCentsToEur(f.total),
    celdaCsv(f.estado),
    celdaCsv(f.categoriaGasto),
    celdaCsv(f.notas),
    celdaCsv(f.pdfUrl),
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

  // Concurrencia acotada (antes:3 queries secuenciales por perfil)
  await mapConcurrente(perfiles as Perfil[], 5, async (perfil) => {
    try {
      const { data: facturas } = await supabase
        .from('facturas')
        .select('*')
        .eq('perfilId', perfil.id)
        .order('fechaEmision', { ascending: true })

      if (!facturas || facturas.length === 0) return

      const csv = facturasToCsv(facturas as Factura[])
      const hoy = new Date().toISOString().slice(0, 10)
      const contenido = `Copia de seguridad diaria (${hoy}): ${facturas.length} facturas`

      // Evitar duplicar si ya se creó backup hoy
      const { data: yaExiste } = await supabase
        .from('notificaciones')
        .select('id')
        .eq('perfilId', perfil.id)
        .eq('tipo', 'auto_backup')
        .eq('contenido', contenido)
        .limit(1)

      if (yaExiste && yaExiste.length > 0) return

      // Guardar el CSV en el bucket privado (antes se generaba y se descartaba)
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(`backups/${perfil.id}/auto-backup-${hoy}.csv`, csv, {
          contentType: 'text/csv;charset=utf-8',
          upsert: true,
        })

      if (uploadError) {
        console.error(`Error subiendo auto-backup para ${perfil.id}:`, uploadError.message)
        return
      }

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
  })

  return NextResponse.json({ backedUp })
}
