import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/client'

/**
 * Cron job: /api/cron/facturas-recurrentes
 *
 * Llamar una vez al día (via Vercel Cron o external cron).
 * Genera facturas de plantillas recurrentes cuyo día de generación coincide con hoy.
 * Envía email de recordatorio al usuario.
 *
 * Seguridad: comprobar CRON_SECRET en headers.
 */

interface FacturaRecurrente {
  id: string
  perfilId: string
  tipo: string
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  iva: number
  diaGeneracion: number
  activa: boolean
  ultimaGeneracion: string | null
}

interface Perfil {
  id: string
  userId: string
  email: string | null
  nombre: string | null
}

export async function GET(req: NextRequest) {
  // Verificar token de cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoy = new Date()
  const diaActual = hoy.getDate()
  const mesActual = hoy.getMonth() + 1
  const anyoActual = hoy.getFullYear()

  const supabase = createClient()

  // Buscar todas las plantillas activas cuyo día coincide con hoy
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

  // Agrupar por perfilId para enviar un solo email por usuario
  const porPerfil = new Map<string, FacturaRecurrente[]>()
  for (const p of plantillas as FacturaRecurrente[]) {
    const arr = porPerfil.get(p.perfilId) ?? []
    arr.push(p)
    porPerfil.set(p.perfilId, arr)
  }

  for (const [perfilId, templates] of porPerfil) {
    // Generar facturas
    const facturasGeneradas: string[] = []

    for (const tpl of templates) {
      // Verificar que no se ya generó este mes
      if (tpl.ultimaGeneracion) {
        const ultima = new Date(tpl.ultimaGeneracion)
        if (ultima.getMonth() + 1 === mesActual && ultima.getFullYear() === anyoActual) {
          continue
        }
      }

      const importeIva = Math.round(tpl.baseImponible * (tpl.iva / 100))
      const total = tpl.baseImponible + importeIva
      const numero = `${tpl.numero}-${anyoActual}-${String(mesActual).padStart(2, '0')}`

      const { error: insertError } = await supabase
        .from('facturas')
        .insert({
          id: crypto.randomUUID(),
          perfilId: tpl.perfilId,
          numero,
          tipo: tpl.tipo,
          emisorReceptor: tpl.emisorReceptor,
          nifContraparte: tpl.nifContraparte,
          fechaEmision: `${anyoActual}-${String(mesActual).padStart(2, '0')}-${String(tpl.diaGeneracion).padStart(2, '0')}`,
          baseImponible: tpl.baseImponible,
          iva: tpl.iva,
          total,
          estado: 'pendiente',
        })

      if (!insertError) {
        facturasGeneradas.push(tpl.emisorReceptor)
        generadas++

        // Actualizar última generación
        await supabase
          .from('facturas_recurrentes')
          .update({ ultimaGeneracion: hoy.toISOString() })
          .eq('id', tpl.id)
      }
    }

    // Enviar email de recordatorio si se generaron facturas
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
  const lista = contrapartes.map(c => `• ${c}`).join('\br')

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
