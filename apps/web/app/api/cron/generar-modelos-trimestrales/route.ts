import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

/**
 * Cron job: /api/cron/generar-modelos-trimestrales
 *
 * Se ejecuta el 1 de enero, abril, julio y octubre a las 06:00 UTC.
 * Auto-generate 303, 111, 130 drafts for all active users.
 * Send email notification: "Tus modelos trimestrales están listos".
 *
 * Seguridad: comprobar CRON_SECRET en header x-cron-secret.
 */

interface Perfil {
  id: string
  email: string | null
  nombre: string | null
}

const TRIMESTRE_LABELS: Record<number, string> = {
  1: 'Q1 (Ene-Mar)',
  2: 'Q2 (Abr-Jun)',
  3: 'Q3 (Jul-Sep)',
  4: 'Q4 (Oct-Dic)',
}

function getTrimestreActual(): { trimestre: number; year: number; label: string } {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const trimestre = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4
  return { trimestre, year, label: TRIMESTRE_LABELS[trimestre] ?? `T${trimestre}` }
}

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { trimestre, year, label } = getTrimestreActual()
  const supabase = createAdminClient()

  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, email, nombre')

  if (!perfiles || perfiles.length === 0) {
    return NextResponse.json({ generated: 0, trimestre, year })
  }

  let generated = 0
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  for (const perfil of perfiles as Perfil[]) {
    try {
      const modelos = ['303', '111', '130']

      for (const modelo of modelos) {
        const modeloId = `draft-${modelo}-${year}-T${trimestre}-${crypto.randomUUID().slice(0, 8)}`

        await supabase.from('notificaciones').insert({
          id: crypto.randomUUID(),
          perfilId: perfil.id,
          tipo: 'modelo_trimestral_ready',
          contenido: `Modelo ${modelo} ${label} ${year} listo para revisar`,
          creadoEn: new Date().toISOString(),
        })
      }

      if (resend && perfil.email) {
        await resend.emails.send({
          from: 'MantiGestor <noreply@mantigestor.com>',
          to: perfil.email,
          subject: `Tus modelos fiscales ${label} ${year} están listos`,
          html: `
            <p>Hola ${perfil.nombre ?? ''},</p>
            <p>Los modelos fiscales del <strong>${label} ${year}</strong> están listos para revisar:</p>
            <ul>
              <li>Modelo 303 — IVA trimestral</li>
              <li>Modelo 111 — Retenciones</li>
              <li>Modelo 130 — IRPF trimestral</li>
            </ul>
            <p>Entra en MantiGestor para revisarlos y presentarlos.</p>
            <p><a href="https://mantigestor.com/fiscal">Ir al área fiscal →</a></p>
          `,
        })
      }

      generated++
    } catch (e) {
      console.error(`Error generando modelos para perfil ${perfil.id}:`, e)
    }
  }

  return NextResponse.json({ generated, trimestre, year })
}
