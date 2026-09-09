import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

let fromHandler: (table: string) => unknown

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => fromHandler(table)),
  })),
}))

vi.mock('@/lib/api-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  unauthorized: vi.fn(() => jsonResponse({ error: 'No autorizado' }, 401)),
  badRequest: vi.fn((e: Error) => jsonResponse({ error: e.message }, 400)),
  serverError: vi.fn(() => jsonResponse({ error: 'Error interno del servidor' }, 500)),
}))

vi.mock('@/lib/rate-limit-ip', () => ({
  rateLimitByIp: vi.fn().mockResolvedValue({ success: true, remaining: 29 }),
}))

import { createServerClient } from '@supabase/ssr'
import { POST } from '@/app/api/fiscal/asociar-persona/route'
import { getAuthenticatedUser } from '@/lib/api-helpers'

function queryChain(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockResolvedValue(result),
  }
}

function insertResult(error: unknown = null) {
  return { insert: vi.fn().mockResolvedValue({ error }) }
}

function req(body: unknown) {
  return new NextRequest('http://localhost/api/fiscal/asociar-persona', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createServerClient).mockImplementation(() => ({
    from: vi.fn((table: string) => fromHandler(table)),
  }) as any)
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
  delete process.env.RESEND_API_KEY
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' } as any)
})

describe('POST /api/fiscal/asociar-persona', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null as any)

    const res = await POST(req({ email: 'new@test.com' }))

    expect(res.status).toBe(401)
  })

  it('returns 400 when email is invalid', async () => {
    const res = await POST(req({ email: 'invalid' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Datos inválidos')
  })

  it('returns 400 when email already has a profile', async () => {
    fromHandler = vi.fn()
      .mockReturnValueOnce(queryChain({ data: { id: 'existing', userId: 'uid' } }))
      .mockReturnValueOnce(queryChain({ data: { id: 'assoc-1' } }))

    const res = await POST(req({ email: 'existing@test.com' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('ya está asociada')
  })

  it('creates profile + association and returns ok', async () => {
    fromHandler = vi.fn()
      .mockReturnValueOnce(queryChain({ data: null }))
      .mockReturnValueOnce(queryChain({ data: null }))
      .mockReturnValueOnce(queryChain({ error: null }))

    const res = await POST(req({ email: 'new@test.com', nombre: 'Juan', nif: '12345678A' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.invitacionId).toBeDefined()
  })

  it('returns 500 when profile creation fails', async () => {
    fromHandler = vi.fn()
      .mockReturnValueOnce(queryChain({ data: null }))
      .mockReturnValueOnce(queryChain({ data: null }))
      .mockReturnValueOnce(queryChain({ error: { message: 'db error' } }))

    const res = await POST(req({ email: 'new@test.com' }))

    expect(res.status).toBe(500)
  })

  it('skips email when RESEND_API_KEY is not set', async () => {
    fromHandler = vi.fn()
      .mockReturnValueOnce(queryChain({ data: null }))
      .mockReturnValueOnce(queryChain({ data: null }))
      .mockReturnValueOnce(queryChain({ error: null }))

    const res = await POST(req({ email: 'new@test.com' }))

    expect(res.status).toBe(200)
  })
})
