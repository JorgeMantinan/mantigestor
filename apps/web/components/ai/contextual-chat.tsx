'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, X, Minimize2, Sparkles, Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Mensaje {
  role: 'user' | 'assistant'
  content: string
}

type ContextoPagina = 'facturas' | 'fiscal' | 'nominas' | 'alquiler' | 'general'

const ACCIONES_RAPIDAS: Record<ContextoPagina, string[]> = {
  facturas: ['Crear factura', '¿Qué facturas tengo pendientes?'],
  fiscal: ['¿Qué modelos tengo que presentar?', 'Calcular IRPF'],
  nominas: ['Calcular nómina', '¿Qué retenciones aplico?'],
  alquiler: ['Calcular gastos deducibles', '¿Cómo declaro el alquiler?'],
  general: ['¿Qué puedo deducir?', 'Resumen del mes'],
}

const STORAGE_KEY = 'mantigestor_chat_historial'

function detectarContexto(pathname: string): ContextoPagina {
  if (pathname.includes('/gestoria/facturas') || pathname.includes('/facturas')) return 'facturas'
  if (pathname.includes('/fiscal') || pathname.includes('/gestoria/trimestres') || pathname.includes('/gestoria/renta')) return 'fiscal'
  if (pathname.includes('/nominas')) return 'nominas'
  if (pathname.includes('/alquiler')) return 'alquiler'
  return 'general'
}

function contextoLabel(ctx: ContextoPagina): string {
  switch (ctx) {
    case 'facturas': return 'Facturas'
    case 'fiscal': return 'Fiscal'
    case 'nominas': return 'Nóminas'
    case 'alquiler': return 'Alquiler'
    case 'general': return 'General'
  }
}

export function ContextualChat() {
  const pathname = usePathname()
  const contexto = useMemo(() => detectarContexto(pathname), [pathname])
  const [abierto, setAbierto] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [auth, setAuth] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data: { user } }) => setAuth(!!user))
  }, [getSupabase])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setMensajes(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    if (mensajes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes.slice(-50)))
    }
  }, [mensajes])

  const handleSend = useCallback(async (msg?: string) => {
    const texto = (msg ?? input).trim()
    if (!texto || loading) return
    setInput('')
    setMensajes(prev => [...prev, { role: 'user', content: texto }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          historial: mensajes.slice(-6),
          contexto: contexto,
        }),
      })

      if (!res.ok) throw new Error('Error de conexión')

      const { respuesta } = await res.json()
      setMensajes(prev => [...prev, { role: 'assistant', content: respuesta }])
    } catch {
      setMensajes(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error. Inténtalo de nuevo.' }])
    }
    setLoading(false)
  }, [input, loading, mensajes, contexto])

  const handleClear = useCallback(() => {
    setMensajes([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const accionesRapidas = ACCIONES_RAPIDAS[contexto]

  if (!abierto) {
    return (
      <Button
        onClick={() => setAbierto(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        aria-label="Abrir chat contextual"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex flex-col rounded-lg border bg-background shadow-xl transition-all duration-300',
        minimizado ? 'h-14 w-72' : 'h-[480px] w-80'
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold">MantiBot</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {contextoLabel(contexto)}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMinimizado(!minimizado)}
            aria-label={minimizado ? 'Expandir' : 'Minimizar'}
          >
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar chat"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {!minimizado && (
        <>
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {mensajes.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <Sparkles className="h-8 w-8 text-primary" />
                <p className="text-sm font-medium">¿En qué puedo ayudarte en {contextoLabel(contexto).toLowerCase()}?</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {accionesRapidas.map((a) => (
                    <Button
                      key={a}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => void handleSend(a)}
                    >
                      {a}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-1.5 text-xs',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Pensando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Acciones rápidas */}
          {mensajes.length === 0 && (
            <div className="border-t px-3 py-2">
              <p className="text-[10px] text-muted-foreground mb-1.5">Acciones rápidas:</p>
              <div className="flex flex-wrap gap-1">
                {accionesRapidas.map((a) => (
                  <Button
                    key={a}
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-6 px-2"
                    onClick={() => void handleSend(a)}
                  >
                    {a}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-1.5">
              <Input
                placeholder={auth ? 'Escribe tu pregunta...' : 'Inicia sesión para usar el chat'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
                disabled={loading || !auth}
                className="h-8 text-xs"
              />
              <Button
                onClick={() => void handleSend()}
                disabled={loading || !input.trim() || !auth}
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Enviar mensaje"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
            {mensajes.length > 0 && (
              <button
                onClick={handleClear}
                className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Limpiar historial
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
