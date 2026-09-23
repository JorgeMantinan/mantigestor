import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export function generateReferralCode(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0
  }, 0)
  const code = Math.abs(hash).toString(36).toUpperCase().slice(0, 6)
  return `MG${code}`
}

export async function getReferralStats(req: NextRequest, userId: string) {
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

  const { data: invitaciones } = await supabase
    .from('invitaciones_pendientes')
    .select('id, email, aceptada, createdAt')
    .eq('invitadoPorUserId', userId)

  const totalInvitaciones = invitaciones?.length ?? 0
  const aceptadas = invitaciones?.filter(i => i.aceptada).length ?? 0
  const pendientes = totalInvitaciones - aceptadas

  return {
    codigo: generateReferralCode(userId),
    totalInvitaciones,
    aceptadas,
    pendientes,
    invitaciones: invitaciones ?? [],
  }
}

export async function createReferral(
  req: NextRequest,
  userId: string,
  userEmail: string,
  emailInvitado: string,
  nombre?: string
) {
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

  const { data: existente } = await supabase
    .from('invitaciones_pendientes')
    .select('id')
    .eq('email', emailInvitado)
    .eq('invitadoPorUserId', userId)
    .maybeSingle()

  if (existente) {
    throw new Error('Ya has invitado a este email')
  }

  // Búsqueda por email en otros usuarios → service_role (RLS no permite leer perfiles ajenos)
  const { data: perfilInvitado } = await createAdminClient()
    .from('perfiles')
    .select('id')
    .eq('email', emailInvitado)
    .maybeSingle()

  if (perfilInvitado) {
    throw new Error('Este email ya tiene cuenta en MantiGestor')
  }

  const id = crypto.randomUUID()
  const { error } = await supabase
    .from('invitaciones_pendientes')
    .insert({
      id,
      email: emailInvitado,
      nombre: nombre ?? null,
      invitadoPorUserId: userId,
      invitadoPorEmail: userEmail,
      aceptada: false,
      createdAt: new Date().toISOString(),
    })

  if (error) throw new Error('No se pudo crear la invitación')

  return { id, email: emailInvitado }
}
