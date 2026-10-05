import { NextResponse, type NextRequest } from 'next/server'
import { escapeHtml } from '@/lib/escape-html'
import { mapConcurrente } from '@/lib/concurrency'
import { verificarCron } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { regenerarModelosPeriodo } from '@/lib/fiscal/modelos-generados'
import type { Trimestre } from '@/lib/fiscal/generador-modelos'


export const maxDuration = 300
/**
 * Cron job: /api/cron/generar-modelos-trimestrales
 *
 * Se ejecuta el 1 de enero, abril, julio y octubre a las 06:00 UTC.
 * Recalcula y almacena los modelos 303, 111 y 130 del trimestre CERRADO
 * (borra los anteriores y guarda los nuevos) para todos los perfiles,
 * y envía la notificación "Tus modelos trimestrales están listos".
 *
 * Seguridad: acepta `Authorization: Bearer <CRON_SECRET>` (Vercel Cron)
 * o el header `x-cron-secret`.
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

/** Trimestre y año CERRADOS respecto a la fecha actual (se ejecuta el día 1 del trimestre siguiente) */
function getTrimestreCerrado(fecha: Date = new Date()): { trimestre: Trimestre; year: number; label: string } {
  const mes = fecha.getMonth() + 1
  const year = fecha.getFullYear()
  // Enero → T4 del año anterior; abril → T1; julio → T2; octubre → T3
  const trimestreActual = (mes <= 3 ? 1 : mes <= 6 ? 2 : mes <= 9 ? 3 : 4) as Trimestre
  if (trimestreActual === 1) {
    return { trimestre: 4, year: year - 1, label: TRIMESTRE_LABELS[4] ?? 'Q4 (Oct-Dic)' }
  }
  return {
    trimestre: (trimestreActual - 1) as Trimestre,
    year,
    label: TRIMESTRE_LABELS[trimestreActual - 1] ?? `T${trimestreActual - 1}`,
  }
}

export async function GET(req: NextRequest) {
  if (!verificarCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { trimestre, year, label } = getTrimestreCerrado()
  const supabase = createAdminClient()

  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, email, nombre')

  if (!perfiles || perfiles.length === 0) {
    return NextResponse.json({ generated: 0, trimestre, year })
  }

  let generated = 0
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  // Concurrencia acotada (antes: regeneración + N inserts + email por perfil, secuencial)
  await mapConcurrente(perfiles as Perfil[], 5, async (perfil) => {
    try {
      const { modelos, regenerado } = await regenerarModelosPeriodo(
        supabase,
        perfil.id,
        year,
        trimestre
      )

      if (modelos.length === 0) return

      if (regenerado) {
        for (const modelo of modelos) {
          await supabase.from('notificaciones').insert({
            id: crypto.randomUUID(),
            perfilId: perfil.id,
            tipo: 'modelo_trimestral_ready',
            contenido: `Modelo ${modelo.modelo} ${label} ${year} listo para revisar`,
            creadoEn: new Date().toISOString(),
          })
        }
      }

      if (resend && perfil.email && regenerado) {
        const { error: sendError } = await resend.emails.send({
          from: 'MantiGestor <noreply@mantigestor.com>',
          to: perfil.email,
          subject: `Tus modelos fiscales ${label} ${year} están listos`,
          html: `
            <p>Hola ${escapeHtml(perfil.nombre ?? '')},</p>
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
        if (sendError) console.error('[cron:generar-modelos-trimestrales] error de Resend:', sendError)
      }

      generated++
    } catch (e) {
      console.error(`Error generando modelos para perfil ${perfil.id}:`, e)
    }
  })

  return NextResponse.json({ generated, trimestre, year })
}
