import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const error = searchParams.get('error')
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`)
  }

  if (code) {
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

    if (!exchangeError) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('perfiles').upsert({
          id: user.id,
          userId: user.id,
          email: user.email ?? '',
        }, { onConflict: 'id' })
      }

      const response = NextResponse.redirect(`${origin}${next}`)
      req.cookies.getAll().forEach(c => {
        response.cookies.set({ name: c.name, value: c.value, path: '/' })
      })
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
