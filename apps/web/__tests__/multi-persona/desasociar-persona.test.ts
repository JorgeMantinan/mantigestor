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

import { DELETE } from '@/app/api/fiscal/desasociar-persona/route'
import { getAuthenticatedUser } from '@/lib/api-helpers'

function deleteResult(error: unknown = null) {
  return {
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error }),
      }),
    }),
  }
}

function req(perfilId?: string) {
  const url = perfilId
    ? `http://localhost/api/fiscal/desasociar-persona?perfilId=${perfilId}`
    : 'http://localhost/api/fiscal/desasociar-persona'
  return new NextRequest(url, { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' } as any)
})

describe('DELETE /api/fiscal/desasociar-persona', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null as any)

    const res = await DELETE(req('perfil-1'))

    expect(res.status).toBe(401)
  })

  it('returns 400 when perfilId is missing', async () => {
    const res = await DELETE(req())

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('perfilId requerido')
  })

  it('deletes association when user owns it', async () => {
    fromHandler = vi.fn().mockReturnValue(deleteResult(null))

    const res = await DELETE(req('perfil-1'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns ok even if association does not exist (idempotent)', async () => {
    fromHandler = vi.fn().mockReturnValue(deleteResult(null))

    const res = await DELETE(req('nonexistent-perfil'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
