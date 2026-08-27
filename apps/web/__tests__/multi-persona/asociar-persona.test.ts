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

import { POST } from '@/app/api/fiscal/asociar-persona/route'
import { getAuthenticatedUser } from '@/lib/api-helpers'

function perfilLookup(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
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
    expect(body.error).toBe('Email inválido')
  })

  it('returns 400 when email already has a profile', async () => {
    fromHandler = vi.fn().mockReturnValue(perfilLookup({ data: { id: 'existing', userId: 'uid' } }))

    const res = await POST(req({ email: 'existing@test.com' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('ya tiene un perfil')
  })

  it('creates profile + association and returns ok', async () => {
    const Builder = { insert: vi.fn().mockResolvedValue({ error: null }) }
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilLookup({ data: null }))
      .mockReturnValueOnce(Builder)
      .mockReturnValueOnce(Builder)

    const res = await POST(req({ email: 'new@test.com', nombre: 'Juan', nif: '12345678A' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.perfilId).toBeDefined()
    expect(Builder.insert).toHaveBeenCalledTimes(2)
  })

  it('returns 500 when profile creation fails', async () => {
    const Builder = { insert: vi.fn().mockResolvedValueOnce({ error: { message: 'db error' } }) }
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilLookup({ data: null }))
      .mockReturnValueOnce(Builder)

    const res = await POST(req({ email: 'new@test.com' }))

    expect(res.status).toBe(500)
  })

  it('skips email when RESEND_API_KEY is not set', async () => {
    const Builder = { insert: vi.fn().mockResolvedValue({ error: null }) }
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilLookup({ data: null }))
      .mockReturnValueOnce(Builder)
      .mockReturnValueOnce(Builder)

    const res = await POST(req({ email: 'new@test.com' }))

    expect(res.status).toBe(200)
  })
})
