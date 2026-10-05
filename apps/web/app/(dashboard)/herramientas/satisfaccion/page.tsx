'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Star, Send, BarChart3 } from 'lucide-react'
import { toast, Toaster } from 'sonner'

interface Encuesta {
  id: string
  clienteNombre: string
  clienteEmail: string | null
  puntuacion: number
  comentario: string | null
  creadoEn: string
}

export default function SatisfaccionPage() {
  const { t } = useLanguage()
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [puntuacion, setPuntuacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [hoverStar, setHoverStar] = useState(0)

  useEffect(() => {
    const cargar = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('userId', user.id)
        .single()

      if (!perfil) { setCargando(false); return }

      const { data } = await supabase
        .from('encuestas_satisfaccion')
        .select('*')
        .eq('perfilId', perfil.id)
        .order('creadoEn', { ascending: false })

      setEncuestas((data as Encuesta[]) ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  const enviar = async () => {
    if (!nombre.trim() || puntuacion === 0) {
      toast.error(t('satisfaccion.camposObligatorios'))
      return
    }
    setGuardando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id')
      .eq('userId', user.id)
      .single()

    if (!perfil) { setGuardando(false); return }

    const { error } = await supabase
      .from('encuestas_satisfaccion')
      .insert({
        id: crypto.randomUUID(),
        perfilId: perfil.id,
        clienteNombre: nombre.trim(),
        clienteEmail: email.trim() || null,
        puntuacion,
        comentario: comentario.trim() || null,
        creadoEn: new Date().toISOString(),
      })

    if (error) {
      toast.error(t('satisfaccion.errorGuardar') + ': ' + error.message)
    } else {
      toast.success(t('satisfaccion.encuestaGuardada'))
      setEncuestas(prev => [{
        id: crypto.randomUUID(),
        clienteNombre: nombre.trim(),
        clienteEmail: email.trim() || null,
        puntuacion,
        comentario: comentario.trim() || null,
        creadoEn: new Date().toISOString(),
      }, ...prev])
      setNombre('')
      setEmail('')
      setPuntuacion(0)
      setComentario('')
    }
    setGuardando(false)
  }

  const media = encuestas.length > 0
    ? (encuestas.reduce((s, e) => s + e.puntuacion, 0) / encuestas.length).toFixed(1)
    : '0'

  const distribucion = [5, 4, 3, 2, 1].map(n => ({
    estrellas: n,
    count: encuestas.filter(e => e.puntuacion === n).length,
  }))

  return (
    <div className="space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold">{t('satisfaccion.titulo')}</h1>
        <p className="text-muted-foreground">{t('satisfaccion.subtitulo')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('satisfaccion.totalEncuestas')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{encuestas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('satisfaccion.puntuacionMedia')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {media} <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('satisfaccion.promotores')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {encuestas.length > 0 ? Math.round(encuestas.filter(e => e.puntuacion >= 4).length / encuestas.length * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('satisfaccion.nuevaEncuesta')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('satisfaccion.nombreCliente')}</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder={t('common.nombre')} />
            </div>
            <div className="space-y-2">
              <Label>{t('satisfaccion.emailOpcional')}</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ejemplo.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>{t('satisfaccion.puntuacion')}</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPuntuacion(n)}
                    onMouseEnter={() => setHoverStar(n)}
                    onMouseLeave={() => setHoverStar(0)}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 ${(hoverStar || puntuacion) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('satisfaccion.comentarioOpcional')}</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                placeholder={t('satisfaccion.placeholderComentario')}
              />
            </div>
            <Button onClick={enviar} disabled={guardando || !nombre.trim() || puntuacion === 0}>
              <Send className="mr-2 h-4 w-4" />
              {guardando ? t('satisfaccion.enviando') : t('satisfaccion.enviarEncuesta')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('satisfaccion.distribucion')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {distribucion.map(d => (
              <div key={d.estrellas} className="flex items-center gap-2">
                <span className="text-sm w-8">{d.estrellas}★</span>
                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${encuestas.length > 0 ? (d.count / encuestas.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8 text-right">{d.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {encuestas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('satisfaccion.ultimasEncuestas')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {encuestas.slice(0, 10).map(e => (
                <div key={e.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{e.clienteNombre}</p>
                    {e.comentario && <p className="text-sm text-muted-foreground">{e.comentario}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: e.puntuacion }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
