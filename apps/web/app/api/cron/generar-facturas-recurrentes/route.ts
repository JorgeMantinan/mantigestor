import { NextResponse, type NextRequest } from 'next/server'
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
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
      console.log(`Lock activo para perfil ${perfilId}, saltando`)
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
  const lista = contrapartes.map(c => `• ${c}`).join('\n')

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'MantiGestor <noreply@mantigestor.vercel.app>',
    to: email,
    subject: `MantiGestor — Revisa tus facturas recurrentes de ${nombreMes}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Facturas recurrentes de ${nombreMes}</h2>
        <p>Hola ${nombre ?? ''},</p>
        <p>Se han generado automáticamente las siguientes facturas recurrentes:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          ${lista}
        </div>
        <p>Entra en MantiGestor para revisarlas y guardarlas:</p>
        <a href="https://mantigestor.vercel.app/gestoria/facturas" style="display: inline-block; background: #eab308; color: #000; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Ver facturas
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          Este es un email automático de MantiGestor. Puedes desactivar los recordatorios en ajustes.
        </p>
      </div>
    `,
  })
}
