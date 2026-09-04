import { NextResponse } from 'next/server'

export async function GET() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not set' })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const result = await resend.emails.send({
      from: 'MantiGestor <onboarding@resend.dev>',
      to: 'minimojorgito@gmail.com',
      subject: 'Test MantiGestor',
      html: '<p>Este es un email de prueba de MantiGestor.</p>',
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json({ error: String(error) })
  }
}
