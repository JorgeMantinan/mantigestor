import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    if (error) {
      const msg = errorDescription || error
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`)
    }

    if (!code) {
      return NextResponse.redirect(`${origin}/login?error=no_code`)
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
          setAll: (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set({ name, value, ...options })
            })
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      try {
        const admin = createAdminClient()
        const { error: upsertError } = await admin.from('perfiles').upsert({
          id: user.id,
          userId: user.id,
          email: user.email ?? '',
          nombre: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        }, { onConflict: 'id' })

        if (upsertError) {
          console.error('Perfil upsert error:', upsertError)
        }
      } catch (upsertErr) {
        console.error('Perfil upsert exception:', upsertErr)
      }
    }

    const response = NextResponse.redirect(`${origin}${next}`)
    req.cookies.getAll().forEach(c => {
      response.cookies.set({ name: c.name, value: c.value, path: '/' })
    })
    return response
  } catch (err) {
    console.error('Auth callback error:', err)
    const origin = new URL(req.url).origin
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }
}
