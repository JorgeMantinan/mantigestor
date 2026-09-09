import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  ConsultaIrpfSchema,
  calcularIrpf,
  calcularCuotaEscala,
  type EscalaIrpf,
} from '@mantigestor/utils'
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { obtenerEscalasIrpf } from '@/lib/fiscal/datos'

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
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

    const body = await req.json()
    const parsed = ConsultaIrpfSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const { comunidad, baseLiquidableEur, taxYear } = parsed.data
    const escalas = await obtenerEscalasIrpf(supabase, comunidad, taxYear)

    if (!escalas.estatal || !escalas.autonomica) {
      return NextResponse.json(
        { error: 'No se puede calcular el IRPF', avisos: escalas.avisos },
        { status: 422 }
      )
    }

    const baseCentimos = Math.round(baseLiquidableEur * 100)
    const resultado = calcularIrpf(
      baseCentimos,
      escalas.estatal as EscalaIrpf,
      escalas.autonomica as EscalaIrpf
    )

    return Response.json({
      data: {
        comunidad: escalas.comunidad,
        regimen: escalas.regimen,
        taxYear,
        baseLiquidableCentimos: resultado.baseLiquidableCentimos,
        cuotaEstatalCentimos: resultado.estatal.cuotaTotalCentimos,
        tipoMedioEstatalPct: resultado.estatal.tipoMedioPct,
        cuotaAutonomicaCentimos: resultado.autonomica.cuotaTotalCentimos,
        tipoMedioAutonomicoPct: resultado.autonomica.tipoMedioPct,
        cuotaIntegraCentimos: resultado.cuotaIntegraCentimos,
        tipoMedioCombinadoPct: Number(
          ((resultado.cuotaIntegraCentimos / baseCentimos) * 100).toFixed(2)
        ),
        detalleEstatal: resultado.estatal.detalle,
        detalleAutonomico: resultado.autonomica.detalle,
        datosVerificados: false,
      },
      avisos: [...escalas.avisos, ...resultado.avisos],
    })
  } catch (error) {
    return serverError(error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req)
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
    const comunidad = searchParams.get('comunidad') ?? ''
    if (comunidad.length < 2) return badRequest('Indica una comunidad autónoma válida')

    const escalas = await obtenerEscalasIrpf(supabase, comunidad, 2025)

    return Response.json({
      data: {
        regimen: escalas.regimen,
        tramosEstatales: escalas.estatal?.tramos ?? [],
        tramosAutonomicos: escalas.autonomica?.tramos ?? [],
      },
      avisos: escalas.avisos,
    })
  } catch (error) {
    return serverError(error)
  }
}
