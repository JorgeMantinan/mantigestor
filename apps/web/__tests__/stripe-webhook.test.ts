import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/stripe/webhook/route'

// ── mocks ────────────────────────────────────────────────────────────────
const constructEvent = vi.fn()
const subscriptionsRetrieve = vi.fn()

vi.mock('@/lib/stripe/server', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  return {
    ...original,
    stripe: {
      webhooks: { constructEvent: (...args: unknown[]) => constructEvent(...args) },
      subscriptions: { retrieve: (...args: unknown[]) => subscriptionsRetrieve(...args) },
    },
  }
})

let fromHandler: (tabla: string) => unknown

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((tabla: string) => fromHandler(tabla)),
  })),
}))

function cadena(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  }
}

function request(body: string, conFirma = true): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (conFirma) headers['stripe-signature'] = 't=1700000000,v1=firma-test'
  return new Request('http://localhost/api/stripe/webhook', { method: 'POST', headers, body })
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro_test'
  })

  const suscripcionPro = {
    current_period_start: 1700000000,
    current_period_end: 1703000000,
    items: { data: [{ price: { id: 'price_pro_test' } }] },
  }

  it('devuelve 400 si falta la cabecera stripe-signature', async () => {
    const res = await POST(request('{}', false))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('No signature')
    expect(constructEvent).not.toHaveBeenCalled()
  })

  it('devuelve 400 si la firma no es válida (constructEvent lanza)', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature')
    })
    const res = await POST(request('{}'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid signature')
  })

  it('checkout.session.completed válido: inserta la suscripción PRO y responde 200', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'user-1' },
          subscription: 'sub_123',
        },
      },
    })
    subscriptionsRetrieve.mockReturnValue(suscripcionPro)

    const insert = vi.fn().mockResolvedValue({ error: null })
    fromHandler = vi
      .fn()
      .mockReturnValueOnce(cadena({ data: null })) // suscripciones: no existe aún
      .mockReturnValueOnce({ ...cadena({ data: { id: 'perfil-1' } }), insert }) // perfiles
      .mockReturnValueOnce({ ...cadena({}), insert }) // insert suscripción

    const res = await POST(request(JSON.stringify({ ok: true })))

    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
    expect(constructEvent).toHaveBeenCalledWith(expect.any(String), 't=1700000000,v1=firma-test', 'whsec_test')
    expect(insert).toHaveBeenCalledTimes(1)
    const payload = insert.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload.perfilId).toBe('perfil-1')
    expect(payload.tier).toBe('PRO')
    expect(payload.providerSubscriptionId).toBe('sub_123')
  })

  it('una suscripción que NO es el plan PRO no se materializa (evasión de pago)', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { metadata: { userId: 'user-1' }, subscription: 'sub_cobro_barato' } },
    })
    // Cobro recurrente: price distinto al PRO
    subscriptionsRetrieve.mockReturnValue({
      current_period_start: 1700000000,
      current_period_end: 1703000000,
      items: { data: [{ price: { id: 'price_cobro_50' } }] },
    })
    const insert = vi.fn()
    fromHandler = vi.fn().mockReturnValueOnce({ ...cadena({ data: null }), insert })

    const res = await POST(request('{}'))

    expect(res.status).toBe(200)
    expect(insert).not.toHaveBeenCalled()
  })

  it('es idempotente: si la suscripción ya existe no inserta de nuevo', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { metadata: { userId: 'user-1' }, subscription: 'sub_123' } },
    })
    subscriptionsRetrieve.mockReturnValue(suscripcionPro)
    const insert = vi.fn()
    fromHandler = vi.fn().mockReturnValueOnce({ ...cadena({ data: { id: 'sub-existente' } }), insert })

    const res = await POST(request('{}'))

    expect(res.status).toBe(200)
    expect(insert).not.toHaveBeenCalled()
  })

  it('un error de base de datos NO hace fallar el webhook (Stripe exige 200)', async () => {
    constructEvent.mockReturnValue({ type: 'evento-desconocido', data: { object: {} } })
    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it('si el handler lanza una excepción responde igualmente 200 (reintentos de Stripe)', async () => {
    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { metadata: { userId: 'user-1' }, subscription: 'sub_123' } },
    })
    subscriptionsRetrieve.mockImplementation(() => {
      throw new Error('stripe caído')
    })
    fromHandler = vi.fn().mockReturnValueOnce(cadena({ data: null }))

    const res = await POST(request('{}'))
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })
})
