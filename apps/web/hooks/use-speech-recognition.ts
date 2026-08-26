'use client'

import { useCallback, useRef, useState } from 'react'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export interface UseSpeechRecognitionReturn {
  escuchando: boolean
  transcripcion: string
  transcripcionInterina: string
  soportado: boolean
  error: string | null
  iniciar: () => void
  parar: () => void
  limpiar: () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [escuchando, setEscuchando] = useState(false)
  const [transcripcion, setTranscripcion] = useState('')
  const [transcripcionInterina, setTranscripcionInterina] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const textoFinalRef = useRef('')

  const soportado = typeof window !== 'undefined'
    ? Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    : false

  const iniciar = useCallback(() => {
    if (!soportado) {
      setError('Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    // Abortar instancia previa si existe
    recognitionRef.current?.abort()

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.interimResults = true
    recognition.continuous = true

    textoFinalRef.current = ''
    setTranscripcion('')
    setTranscripcionInterina('')
    setError(null)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let textoFinal = ''
      let textoInterino = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue
        const texto = result[0]?.transcript ?? ''
        if (result.isFinal) {
          textoFinal += texto
        } else {
          textoInterino += texto
        }
      }

      if (textoFinal) {
        textoFinalRef.current += textoFinal
      }
      setTranscripcion(textoFinalRef.current)
      setTranscripcionInterina(textoInterino)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return
      setError(
        event.error === 'not-allowed'
          ? 'Permiso de microfono denegado. Permite el acceso al microfono en la configuracion del navegador.'
          : `Error de reconocimiento de voz: ${event.error}`
      )
      setEscuchando(false)
    }

    recognition.onend = () => {
      setEscuchando(false)
      setTranscripcion(textoFinalRef.current)
      setTranscripcionInterina('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setEscuchando(true)
  }, [soportado])

  const parar = useCallback(() => {
    recognitionRef.current?.stop()
    setEscuchando(false)
  }, [])

  const limpiar = useCallback(() => {
    recognitionRef.current?.abort()
    textoFinalRef.current = ''
    setTranscripcion('')
    setTranscripcionInterina('')
    setError(null)
    setEscuchando(false)
  }, [])

  return {
    escuchando,
    transcripcion,
    transcripcionInterina,
    soportado,
    error,
    iniciar,
    parar,
    limpiar,
  }
}
