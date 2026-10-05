import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

function get(url: string, cookies: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, {
    headers: cookies ? { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') } : {},
  })
}

describe('middleware', () => {
  const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL
  const keyOriginal = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test'
  })

  afterEach(() => {
    if (urlOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = urlOriginal
    if (keyOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = keyOriginal
  })

  it('las rutas /api/ pasan sin sesión (webhook de Stripe y crons)', async () => {
    const res = await middleware(get('http://localhost/api/stripe/webhook'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('los crons pasan igual (sin cookie)', async () => {
    const res = await middleware(get('http://localhost/api/cron/recordatorios-plazos'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('una página protegida sin sesión redirige a /login', async () => {
    const res = await middleware(get('http://localhost/dashboard'))
    expect(res.headers.get('location')).toContain('/login')
    expect(res.headers.get('location')).toContain('redirect=%2Fdashboard')
  })

  it('las páginas públicas no redirigen', async () => {
    for (const ruta of ['/login', '/register', '/precios', '/demo', '/confirmar-asociacion', '/factura', '/']) {
      const res = await middleware(get(`http://localhost${ruta}`))
      expect(res.headers.get('location'), ruta).toBeNull()
    }
  })

  it('con una cookie de sesión (JWT con sub) pasa a páginas protegidas', async () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'user-123' })).toString('base64')
    const valor = `eyJhbGciOiJIUzI1NiJ9.${payload}.firma`
    const res = await middleware(get('http://localhost/dashboard', { 'sb-test-auth-token.0': valor }))
    expect(res.headers.get('location')).toBeNull()
  })

  it('si faltan las env vars no entra en bucle de redirecciones', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const raiz = await middleware(get('http://localhost/'))
    expect(raiz.headers.get('location')).toBeNull() // "/" no se redirige a sí mismo
    const otra = await middleware(get('http://localhost/dashboard'))
    expect(otra.headers.get('location')).toContain('localhost/') // el resto va a "/"
  })
})
