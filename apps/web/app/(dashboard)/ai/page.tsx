'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PiggyBank, Send, Sparkles, AlertCircle } from 'lucide-react'

interface Mensaje {
  role: 'user' | 'assistant'
  content: string
}

const SUGERENCIAS = [
  '¿Cómo calculo el IVA de una factura?',
  '¿Cuándo se presenta el Modelo 303?',
  '¿Qué gastos puedo deducir como autónomo?',
  '¿Cómo funciona el módulo de alumnos?',
]

export default function AiPage() {
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMensajes((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: userMsg,
          historial: mensajes.slice(-6),
        }),
      })

      if (!res.ok) throw new Error('Error al conectar con la IA')

      const { respuesta } = await res.json()
      setMensajes((prev) => [...prev, { role: 'assistant', content: respuesta }])
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, inténtalo de nuevo.',
        },
      ])
    }
    setLoading(false)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col space-y-4">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Asistente IA</h1>
        <p className="text-muted-foreground">
          Pregunta sobre fiscalidad, facturas, trámites o cómo usar MantiGestor
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">MantiBot</CardTitle>
            <CardDescription>— Asistente con IA</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mensajes.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <Sparkles className="h-12 w-12 text-primary" />
                <div>
                  <p className="text-lg font-medium">¿En qué puedo ayudarte?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pregunta sobre cualquier tema fiscal o de gestión
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGERENCIAS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => { setInput(s); handleSend() }}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
                  <span className="animate-pulse">Pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Escribe tu pregunta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={loading || !auth}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim() || !auth} aria-label="Enviar mensaje">
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {!auth && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Inicia sesión para usar el asistente
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
