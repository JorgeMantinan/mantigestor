import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const { email, nombre, contrapartes, mes, anyo } = await req.json()

    if (!email || !contrapartes?.length || !mes || !anyo) {
      return badRequest('Faltan campos')
    }

    if (!process.env.RESEND_API_KEY) {
      // Sin API key: silencioso, no es error crítico
      return NextResponse.json({ ok: true, skipped: true })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const nombreMes = new Date(anyo, mes - 1).toLocaleDateString('es-ES', { month: 'long' })
    const lista = contrapartes.map((c: string) => `<li style="padding:4px 0">${c}</li>`).join('')

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'MantiGestor <onboarding@resend.dev>',
      to: email,
      subject: `MantiGestor — Revisa tus facturas recurrentes de ${nombreMes}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#1a1a1a;margin-bottom:8px">Facturas recurrentes de ${nombreMes}</h2>
          <p>Hola${nombre ? ` ${nombre}` : ''},</p>
          <p>Se han generado automáticamente las siguientes facturas recurrentes:</p>
          <ul style="background:#f5f5f5;padding:16px 16px 16px 28px;border-radius:8px;margin:16px 0">
            ${lista}
          </ul>
          <p>Entra en MantiGestor para revisarlas y guardarlas:</p>
          <a href="https://mantigestor.vercel.app/gestoria/facturas" style="display:inline-block;background:#eab308;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">
            Ver facturas
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            Email automático de MantiGestor. Puedes desactivar los recordatorios en ajustes.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
