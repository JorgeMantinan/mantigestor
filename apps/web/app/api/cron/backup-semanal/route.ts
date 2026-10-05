import { NextResponse, type NextRequest } from 'next/server'
import { verificarCron } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

/**
 * Cron job: /api/cron/backup-semanal
 *
 * Se ejecuta los domingos a las 02:00 UTC.
 * Backup completo de todos los usuarios activos (facturas, documentos, suscripciones, notificaciones).
 * Almacena en Supabase Storage con sufijo de fecha y envía email de notificación.
 *
 * Seguridad: comprobar CRON_SECRET en header x-cron-secret.
 */

interface Perfil {
  id: string
  email: string | null
  nombre: string | null
}

interface BackupData {
  version: string
  exportedAt: string
  perfilId: string
  facturas: unknown[]
  documentos: unknown[]
  suscripciones: unknown[]
  notificaciones: unknown[]
}

export async function GET(req: NextRequest) {
    if (!verificarCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const supabase = createAdminClient()
  const fecha = new Date().toISOString().slice(0, 10)
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, email, nombre')

  if (!perfiles || perfiles.length === 0) {
    return NextResponse.json({ backedUp: 0 })
  }

  let backedUp = 0

  for (const perfil of perfiles as Perfil[]) {
    try {
      const [facturasRes, documentosRes, suscripcionesRes, notificacionesRes] = await Promise.all([
        supabase.from('facturas').select('*').eq('perfilId', perfil.id).order('fechaEmision', { ascending: true }),
        supabase.from('documentos').select('*').eq('perfilId', perfil.id),
        supabase.from('suscripciones').select('*').eq('perfilId', perfil.id),
        supabase.from('notificaciones').select('*').eq('perfilId', perfil.id).order('creadoEn', { ascending: false }),
      ])

      const backup: BackupData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        perfilId: perfil.id,
        facturas: facturasRes.data ?? [],
        documentos: documentosRes.data ?? [],
        suscripciones: suscripcionesRes.data ?? [],
        notificaciones: notificacionesRes.data ?? [],
      }

      const path = `backups/${perfil.id}/backup-semanal-${fecha}.json`
      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })

      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(path, blob, { contentType: 'application/json', upsert: true })

      if (uploadError) {
        console.error(`Error subiendo backup para ${perfil.id}:`, uploadError.message)
        continue
      }

      // Bucket privado: URL firmada válida 7 días
      const { data: urlData } = await supabase.storage.from('backups').createSignedUrl(path, 604800)

      if (resend && perfil.email && urlData?.signedUrl) {
        await resend.emails.send({
          from: 'MantiGestor <noreply@mantigestor.com>',
          to: perfil.email,
          subject: `Backup semanal MantiGestor — ${fecha}`,
          html: `
            <p>Hola ${perfil.nombre ?? ''},</p>
            <p>Tu backup semanal de MantiGestor está disponible:</p>
            <ul>
              <li>${backup.facturas.length} facturas</li>
              <li>${backup.documentos.length} documentos</li>
              <li>${backup.suscripciones.length} suscripciones</li>
            </ul>
            <p><a href="${urlData.signedUrl}">Descargar backup →</a></p>
          `,
        })
      }

      backedUp++
    } catch (e) {
      console.error(`Error en backup semanal para perfil ${perfil.id}:`, e)
    }
  }

  return NextResponse.json({ backedUp, fecha })
}
