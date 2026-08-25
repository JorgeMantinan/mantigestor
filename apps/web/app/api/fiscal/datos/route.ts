import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import {
  obtenerEscalasIrpf,
  obtenerEscalaAhorroForal,
  obtenerTramosReta,
  obtenerProximosPlazosFiscales,
  obtenerReglasIva,
  obtenerTiposIs,
  obtenerEscalaPatrimonio,
  obtenerMinimos,
  obtenerReducciones,
  AVISO_NO_VERIFICADO,
} from '@/lib/fiscal/datos'

export async function GET(req: NextRequest) {
  try {
    const { success } = rateLimitByIp(req)
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      )
    }
    const user = await getAuthenticatedUser(req)
    if (!user) return unauthorized()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => req.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    )

    const { searchParams } = new URL(req.url)
    const comunidad = (searchParams.get('comunidad') ?? 'Madrid (Comunidad de)').slice(0, 80)
    const taxYear = parseInt(searchParams.get('taxYear') ?? '2025', 10)
    if (!/^(19|20)\d{2}$/.test(String(taxYear))) return badRequest('Año fiscal inválido')

    const [escalas, ahorroForal, reta, plazos, iva, is, patrimonio, minimos, reducciones] = await Promise.all([
      obtenerEscalasIrpf(supabase, comunidad, taxYear),
      obtenerEscalaAhorroForal(supabase, comunidad, taxYear),
      obtenerTramosReta(supabase, 2026),
      obtenerProximosPlazosFiscales(supabase, new Date()),
      obtenerReglasIva(supabase, taxYear),
      obtenerTiposIs(supabase),
      obtenerEscalaPatrimonio(supabase, taxYear),
      obtenerMinimos(supabase, taxYear),
      obtenerReducciones(supabase, taxYear),
    ])

    const avisos = [
      ...escalas.avisos,
      ...ahorroForal.avisos,
      ...reta.avisos,
      ...patrimonio.avisos,
      ...(iva.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []),
      ...(is.filter(f => !f.previsto).some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []),
      ...(minimos.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []),
      ...(reducciones.some(f => f.status !== 'OFFICIAL_VERIFIED') ? [AVISO_NO_VERIFICADO] : []),
    ]
    const avisosUnicos = [...new Set(avisos)]

    return Response.json({
      data: {
        taxYear,
        regimen: escalas.regimen,
        escalaEstatal: escalas.estatal,
        escalaAutonomica: escalas.autonomica,
        escalaAhorroForal: ahorroForal.escala,
        reglasIva: iva,
        tramosReta: reta.tramos,
        tiposIs: is,
        escalaPatrimonio: patrimonio.tramos,
        minimos,
        reducciones,
        plazos,
      },
      avisos: avisosUnicos,
    })
  } catch (error) {
    return serverError(error)
  }
}
