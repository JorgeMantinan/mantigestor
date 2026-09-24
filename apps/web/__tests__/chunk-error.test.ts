import { describe, it, expect } from 'vitest'
import { isChunkLoadError } from '@/lib/chunk-error'

describe('isChunkLoadError', () => {
  it('detecta el mensaje de webpack de producción', () => {
    expect(
      isChunkLoadError(
        'Loading chunk 5642 failed. (error: https://mantigestor.vercel.app/_next/static/chunks/app/(dashboard)/layout-cb963f279825822e.js)'
      )
    ).toBe(true)
  })

  it('detecta errores de módulo dinámico', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://example.com/chunk.js')
      )
    ).toBe(true)
    expect(
      isChunkLoadError(
        new TypeError('Importing a module script failed. (https://example.com/chunk.js)')
      )
    ).toBe(true)
  })

  it('detecta ChunkLoadError de webpack', () => {
    const err = new Error('Loading chunk 12 failed')
    err.name = 'ChunkLoadError'
    expect(isChunkLoadError(err)).toBe(true)
  })

  it('no confunde con otros errores de runtime', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isChunkLoadError('NetworkError when attempting to fetch resource.')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
    expect(isChunkLoadError(42)).toBe(false)
  })
})
