import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // secure:true (merge con los defaults: sameSite lax, maxAge 400d).
      // Nota: httpOnly NO es compatible con el flujo de @supabase/ssr en
      // navegador (el cliente JS debe leer la cookie para refrescar la sesión);
      // la protección real contra robo de token es el escape XSS (lib/escape-html).
      cookieOptions: { secure: true },
    }
  )
}
