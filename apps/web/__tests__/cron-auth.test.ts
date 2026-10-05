import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { verificarCron } from '@/lib/cron-auth'

function crearRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/cron/test', { headers })
}

describe('verificarCron', () => {
  const secretoOriginal = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = 'secreto-de-prueba'
  })

  afterEach(() => {
    if (secretoOriginal === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = secretoOriginal
    }
  })

  it('acepta Authorization: Bearer con el secreto correcto', () => {
    expect(verificarCron(crearRequest({ authorization: 'Bearer secreto-de-prueba' }))).toBe(true)
  })

  it('acepta el header x-cron-secret con el secreto correcto', () => {
    expect(verificarCron(crearRequest({ 'x-cron-secret': 'secreto-de-prueba' }))).toBe(true)
  })

  it('rechaza un secreto incorrecto', () => {
    expect(verificarCron(crearRequest({ authorization: 'Bearer otro-secreto' }))).toBe(false)
    expect(verificarCron(crearRequest({ 'x-cron-secret': 'otro-secreto' }))).toBe(false)
  })

  it('rechaza peticiones sin cabeceras de autenticación', () => {
    expect(verificarCron(crearRequest({}))).toBe(false)
  })

  it('DENIEGA si CRON_SECRET no está definida (cierra "Bearer undefined")', () => {
    delete process.env.CRON_SECRET
    expect(verificarCron(crearRequest({ authorization: 'Bearer undefined' }))).toBe(false)
    expect(verificarCron(crearRequest({ 'x-cron-secret': 'undefined' }))).toBe(false)
  })

  it('rechaza un Bearer vacío', () => {
    expect(verificarCron(crearRequest({ authorization: 'Bearer ' }))).toBe(false)
  })

  it('no lanza con secretos de distinta longitud (timingSafeEqual)', () => {
    expect(verificarCron(crearRequest({ authorization: 'Bearer x' }))).toBe(false)
  })
})
