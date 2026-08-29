'use client'

import { useCallback, useRef, useState } from 'react'
import type { OcrResult } from '@/lib/ocr'
import { rellenarFormularioDesdeOcr } from '@/lib/factura-utils'

interface UseParsearVozOptions {
  formRef: React.RefObject<HTMLFormElement | null>
  onParsed?: (data: OcrResult) => void
}

export function useParsearVoz({ formRef, onParsed }: UseParsearVozOptions) {
  const [parseandoVoz, setParseandoVoz] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const parsearVoz = useCallback(async (texto: string, setError?: (msg: string) => void) => {
    const trimmed = texto.trim()
    if (!trimmed) return
    setParseandoVoz(true)
    setError?.('')
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/facturas/parsear-voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: trimmed }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) {
        const err = await res.json()
        setError?.(err.error || 'Error al procesar el audio')
        return
      }
      const data: OcrResult = await res.json()
      rellenarFormularioDesdeOcr(formRef, data)
      onParsed?.(data)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError?.('Error al conectar con el servicio de IA')
    } finally {
      setParseandoVoz(false)
    }
  }, [formRef, onParsed])

  return { parseandoVoz, parsearVoz }
}
