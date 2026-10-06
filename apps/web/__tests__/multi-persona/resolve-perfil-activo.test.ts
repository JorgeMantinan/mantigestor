import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
let fromHandler: (table: string) => unknown

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => fromHandler(table)),
  })),
}))

import { resolvePerfilActivo } from '@/lib/resolve-perfil-activo'

function perfilQuery(result: { data: { id: string } | null }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function asociacionQuery(result: { data: { rol: string } | null }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }),
  }
}

function req(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/dashboard', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
})

describe('resolvePerfilActivo', () => {
  it('returns own perfilId when no x-perfil-activo header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromHandler = vi.fn().mockReturnValue(perfilQuery({ data: { id: 'perfil-own' } }))

    const result = await resolvePerfilActivo(req())

    expect(result).toEqual({ perfilId: 'perfil-own', esPropio: true, rol: 'propietario' })
    expect(result.error).toBeUndefined()
  })

  it('returns own perfilId when x-perfil-activo matches own perfil', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromHandler = vi.fn().mockReturnValue(perfilQuery({ data: { id: 'perfil-own' } }))

    const result = await resolvePerfilActivo(
      req({ 'x-perfil-activo': 'perfil-own' })
    )

    expect(result).toEqual({ perfilId: 'perfil-own', esPropio: true, rol: 'propietario' })
  })

  it('returns associated perfilId when user is gestor', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilQuery({ data: { id: 'perfil-own' } }))
      .mockReturnValueOnce(asociacionQuery({ data: { rol: 'gestor' } }))

    const result = await resolvePerfilActivo(
      req({ 'x-perfil-activo': 'perfil-other' })
    )

    expect(result).toEqual({ perfilId: 'perfil-other', esPropio: false, rol: 'gestor' })
  })

  it('returns visualizador rol (solo lectura) cuando el usuario es visualizador', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilQuery({ data: { id: 'perfil-own' } }))
      .mockReturnValueOnce(asociacionQuery({ data: { rol: 'visualizador' } }))

    const result = await resolvePerfilActivo(
      req({ 'x-perfil-activo': 'perfil-other' })
    )

    expect(result).toEqual({ perfilId: 'perfil-other', esPropio: false, rol: 'visualizador' })
  })

  it('returns own perfilId with error when user has no access to requested perfil', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    fromHandler = vi.fn()
      .mockReturnValueOnce(perfilQuery({ data: { id: 'perfil-own' } }))
      .mockReturnValueOnce(asociacionQuery({ data: null }))

    const result = await resolvePerfilActivo(
      req({ 'x-perfil-activo': 'perfil-other' })
    )

    expect(result).toEqual({
      perfilId: 'perfil-own',
      esPropio: true,
      rol: 'propietario',
      error: 'No tienes acceso a este perfil',
    })
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await resolvePerfilActivo(req())

    expect(result).toEqual({ perfilId: '', esPropio: false, rol: 'propietario', error: 'No autorizado' })
  })
})
