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
  serverError: vi.fn(() => jsonResponse({ error: 'Error interno del servidor' }, 500)),
}))

import { GET } from '@/app/api/fiscal/mis-personas/route'
import { getAuthenticatedUser } from '@/lib/api-helpers'

function perfilQuery(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function asociacionesQuery(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
  }
}

function perfilesInQuery(result: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue(result),
    }),
  }
}

function req() {
  return new NextRequest('http://localhost/api/fiscal/mis-personas', { method: 'GET' })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: 'user-1', email: 'test@example.com' } as any)
})

describe('GET /api/fiscal/mis-personas', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null as any)

    const res = await GET(req())

    expect(res.status).toBe(401)
  })

  it('returns empty personas + perfilPropioId when no associations', async () => {
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilQuery({ data: { id: 'perfil-own' } }))
      .mockReturnValueOnce(asociacionesQuery({ data: [] }))

    const res = await GET(req())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.personas).toEqual([])
    expect(body.perfilPropioId).toBe('perfil-own')
  })

  it('returns personas list with correct data', async () => {
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilQuery({ data: { id: 'perfil-own' } }))
      .mockReturnValueOnce(asociacionesQuery({
        data: [
          { perfilId: 'perfil-a', rol: 'gestor' },
          { perfilId: 'perfil-b', rol: 'propietario' },
        ],
      }))
      .mockReturnValueOnce(perfilesInQuery({
        data: [
          { id: 'perfil-a', nombre: 'Juan', email: 'juan@test.com' },
          { id: 'perfil-b', nombre: 'Ana', email: 'ana@test.com' },
        ],
      }))

    const res = await GET(req())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.personas).toHaveLength(2)
    expect(body.personas[0]).toEqual({
      perfilId: 'perfil-a',
      nombre: 'Juan',
      email: 'juan@test.com',
      rol: 'gestor',
    })
    expect(body.personas[1]).toEqual({
      perfilId: 'perfil-b',
      nombre: 'Ana',
      email: 'ana@test.com',
      rol: 'propietario',
    })
  })

  it('returns perfilPropioId correctly', async () => {
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilQuery({ data: { id: 'my-perfil-id' } }))
      .mockReturnValueOnce(asociacionesQuery({ data: [] }))

    const res = await GET(req())

    const body = await res.json()
    expect(body.perfilPropioId).toBe('my-perfil-id')
  })
})
