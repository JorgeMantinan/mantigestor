import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { secure: true },
      cookies: {
        async get(name: string) { return (await cookieStore).get(name)?.value },
        async set(name: string, value: string, options: Record<string, unknown>) {
          try { (await cookieStore).set({ name, value, ...options }) } catch {}
        },
        async remove(name: string, options: Record<string, unknown>) {
          try { (await cookieStore).set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}
