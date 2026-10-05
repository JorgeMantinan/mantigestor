import { NextResponse, type NextRequest } from 'next/server'
import { verificarCron } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { acquireLock, releaseLock } from '@/lib/recurring-invoice-lock'

/**
 * Cron job: /api/cron/generar-facturas-recurrentes
 *
 * Llamar una vez al día. Genera facturas automáticas desde plantillas recurrentes
 * cuyo diaGeneracion coincide con el día actual.
 *
 * - Deduplica por mes (ultimaGeneracion)
 * - Usa formato F-YYYY-MM-NNN secuencial
 * - Evalúa triggers de generación
 * - Envía email de recordatorio
 * - Crea notificación in-app
 */

interface FacturaRecurrente {
  id: string
  perfilId: string
  tipo: string
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  iva: number
  categoriaGasto: string | null
  diaGeneracion: number
  activa: boolean
  ultimaGeneracion: string | null
  notas: string | null
}

interface Perfil {
  id: string
  userId: string
  email: string | null
  nombre: string | null
}

function shouldGenerate(template: FacturaRecurrente, today: Date): boolean {
  if (!template.notas) return true
  try {
    const notas = JSON.parse(template.notas)
    if (!notas.triggerTipo) return true

    switch (notas.triggerTipo) {
      case 'fecha_especifica':
        return today.getDate() === notas.triggerValor
      case 'umbral_gasto':
      case 'saldo_bajo':
        // Would need to query additional data — skip for now, log warning
        console.warn(`Trigger ${notas.triggerTipo} requires runtime data, generating by default`)
        return true
      default:
        return true
    }
  } catch {
    return true
  }
}

export async function GET(req: NextRequest) {
    if (!verificarCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const supabase = createAdminClient()
  const hoy = new Date()
  const diaActual = hoy.getDate()
  const mesActual = hoy.getMonth() + 1
  const anyoActual = hoy.getFullYear()

  const { data: plantillas, error: fetchError } = await supabase
    .from('facturas_recurrentes')
    .select('*')
    .eq('activa', true)
    .eq('diaGeneracion', diaActual)

  if (fetchError || !plantillas || plantillas.length === 0) {
    return NextResponse.json({ generated: 0, emails: 0 })
  }

  let generadas = 0
  let emailsEnviados = 0

  const porPerfil = new Map<string, FacturaRecurrente[]>()
  for (const p of plantillas as FacturaRecurrente[]) {
    const arr = porPerfil.get(p.perfilId) ?? []
    arr.push(p)
    porPerfil.set(p.perfilId, arr)
  }

  for (const [perfilId, templates] of porPerfil) {
    if (!acquireLock(perfilId)) {

      continue
    }

    try {
      const facturasGeneradas: string[] = []
      const generatedIds: string[] = []

      for (const tpl of templates) {
        if (tpl.ultimaGeneracion) {
          const ultima = new Date(tpl.ultimaGeneracion)
          if (ultima.getMonth() + 1 === mesActual && ultima.getFullYear() === anyoActual) {
            continue
          }
        }

        if (!shouldGenerate(tpl, hoy)) {
          continue
        }

        const baseImponible = tpl.baseImponible
        const importeIva = Math.round(baseImponible * (tpl.iva / 100))
        const total = baseImponible + importeIva

        // F-YYYY-MM-NNN sequential
        const anyo = hoy.getFullYear()
        const mes = String(hoy.getMonth() + 1).padStart(2, '0')
        const { count } = await supabase
          .from('facturas')
          .select('*', { count: 'exact', head: true })
          .eq('perfilId', perfilId)
          .like('numero', `F-${anyo}-${mes}-%`)

        const num = String((count ?? 0) + 1).padStart(3, '0')
        const numero = `F-${anyo}-${mes}-${num}`

        const { data: inserted, error: insertError } = await supabase
          .from('facturas')
          .insert({
            id: crypto.randomUUID(),
            perfilId,
            numero,
            tipo: tpl.tipo,
            emisorReceptor: tpl.emisorReceptor,
            nifContraparte: tpl.nifContraparte,
            fechaEmision: hoy.toISOString().slice(0, 10),
            baseImponible,
            iva: tpl.iva,
            total,
            estado: 'pendiente',
            categoriaGasto: tpl.categoriaGasto,
            createdAt: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (!insertError && inserted) {
          facturasGeneradas.push(tpl.emisorReceptor)
          generatedIds.push(inserted.id)
          generadas++

          await supabase
            .from('facturas_recurrentes')
            .update({ ultimaGeneracion: hoy.toISOString() })
            .eq('id', tpl.id)
        }
      }

      // In-app notification
      if (generatedIds.length > 0) {
        await supabase.from('notificaciones').insert({
          id: crypto.randomUUID(),
          perfilId,
          tipo: 'factura_generada',
          leido: false,
          contenido: JSON.stringify({
            titulo: 'Facturas recurrentes generadas',
            mensaje: `Se generaron ${generatedIds.length} facturas recurrentes este mes`,
            facturaIds: generatedIds,
          }),
          creadoEn: new Date().toISOString(),
        })
      }

      // Email reminder
      if (facturasGeneradas.length > 0) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('email, nombre')
          .eq('id', perfilId)
          .single()

        const perfilData = perfil as Perfil | null
        if (perfilData?.email) {
          try {
            await enviarEmailRecordatorio(perfilData.email, perfilData.nombre, facturasGeneradas, mesActual, anyoActual)
            emailsEnviados++
          } catch (e) {
            console.error('Error enviando email:', e)
          }
        }
      }
    } finally {
      releaseLock(perfilId)
    }
  }

  return NextResponse.json({ generated: generadas, emails: emailsEnviados })
}

async function enviarEmailRecordatorio(
  email: string,
  nombre: string | null,
  contrapartes: string[],
  mes: number,
  anyo: number
) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const nombreMes = new Date(anyo, mes - 1).toLocaleDateString('es-ES', { month: 'long' })
  const filasTabla = contrapartes.map(c =>
    `<tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${c}</td></tr>`
  ).join('')

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'MantiGestor <noreply@mantigestor.vercel.app>',
    to: email,
    subject: `MantiGestor — Revisa tus facturas recurrentes de ${nombreMes}`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
          <tr><td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:#eab308;padding:24px 32px;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">Manti<span style="color:#ffffff;">Gestor</span></h1>
                  <p style="margin:4px 0 0;font-size:13px;color:#422006;opacity:0.8;">Gestión fiscal inteligente</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#1a1a1a;">Facturas recurrentes de ${nombreMes}</h2>
                  <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">Hola${nombre ? ` ${nombre}` : ''},</p>
                  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Se han generado automáticamente las siguientes facturas recurrentes:</p>
                  <!-- Invoice table -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:24px;">
                    <thead>
                      <tr>
                        <td style="background:#fefce8;padding:10px 14px;font-size:12px;font-weight:600;color:#854d0e;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #eab308;">Contraparte</td>
                      </tr>
                    </thead>
                    <tbody>
                      ${filasTabla}
                    </tbody>
                  </table>
                  <!-- CTA -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr><td align="center">
                      <a href="https://mantigestor.vercel.app/gestoria/facturas" style="display:inline-block;background:#eab308;color:#1a1a1a;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.2px;">Ver facturas</a>
                    </td></tr>
                  </table>
                  <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Puedes desactivar los recordatorios desde <a href="https://mantigestor.vercel.app/ajustes" style="color:#eab308;text-decoration:underline;">Ajustes</a>.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
                  <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">MantiGestor &mdash; Gestión fiscal inteligente</p>
                  <p style="margin:0 0 4px;font-size:11px;color:#d1d5db;">Este es un email automático. No respondas a este mensaje.</p>
                  <p style="margin:0;font-size:11px;color:#d1d5db;"><a href="https://mantigestor.vercel.app/ajustes/notificaciones" style="color:#9ca3af;text-decoration:underline;">Gestionar notificaciones</a></p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
}
