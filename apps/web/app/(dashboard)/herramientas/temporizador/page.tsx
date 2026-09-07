'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'
import { Play, Pause, Square, Clock, Trash2 } from 'lucide-react'

interface SesionTrabajo {
  id: string
  descripcion: string
  horas: number
  tarifaHora: number
  inicio: Date
  fin: Date | null
}

export default function TemporizadorPage() {
  const { t } = useLanguage()
  const [corriendo, setCorriendo] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [descripcion, setDescripcion] = useState('')
  const [tarifaHora, setTarifaHora] = useState('')
  const [sesiones, setSesiones] = useState<SesionTrabajo[]>([])
  const intervaloRef = useRef<NodeJS.Timeout | null>(null)
  const inicioRef = useRef<Date | null>(null)

  useEffect(() => {
    if (corriendo) {
      intervaloRef.current = setInterval(() => {
        setSegundos(s => s + 1)
      }, 1000)
    } else if (intervaloRef.current) {
      clearInterval(intervaloRef.current)
    }
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current) }
  }, [corriendo])

  const formatearTiempo = (seg: number) => {
    const h = Math.floor(seg / 3600)
    const m = Math.floor((seg % 3600) / 60)
    const s = seg % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const iniciar = () => {
    inicioRef.current = new Date()
    setCorriendo(true)
    setSegundos(0)
  }

  const pausar = () => {
    setCorriendo(false)
  }

  const detener = () => {
    if (!inicioRef.current) return
    const horas = segundos / 3600
    const tarifa = parseFloat(tarifaHora) || 0
    const nuevaSesion: SesionTrabajo = {
      id: crypto.randomUUID(),
      descripcion: descripcion || t('temporizador.sinDescripcion'),
      horas,
      tarifaHora: tarifa,
      inicio: inicioRef.current,
      fin: new Date(),
    }
    setSesiones(prev => [nuevaSesion, ...prev])
    setCorriendo(false)
    setSegundos(0)
    setDescripcion('')
    inicioRef.current = null
  }

  const eliminar = (id: string) => {
    setSesiones(prev => prev.filter(s => s.id !== id))
  }

  const totalHoras = sesiones.reduce((s, ses) => s + ses.horas, 0)
  const totalFacturar = sesiones.reduce((s, ses) => s + ses.horas * ses.tarifaHora, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('temporizador.titulo')}</h1>
        <p className="text-muted-foreground">{t('temporizador.subtitulo')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('temporizador.temporizador')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-5xl font-mono font-bold tabular-nums">
              {formatearTiempo(segundos)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="descripcion">{t('temporizador.descripcion')}</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={t('temporizador.placeholderDescripcion')}
                disabled={corriendo}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tarifa">{t('temporizador.tarifaHora')}</Label>
              <Input
                id="tarifa"
                type="number"
                value={tarifaHora}
                onChange={(e) => setTarifaHora(e.target.value)}
                placeholder="50"
                disabled={corriendo}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            {!corriendo ? (
              <Button onClick={iniciar} className="bg-green-600 hover:bg-green-700">
                <Play className="mr-2 h-4 w-4" /> {t('temporizador.iniciar')}
              </Button>
            ) : (
              <>
                <Button onClick={pausar} variant="outline">
                  <Pause className="mr-2 h-4 w-4" /> {t('temporizador.pausar')}
                </Button>
                <Button onClick={detener} variant="destructive">
                  <Square className="mr-2 h-4 w-4" /> {t('temporizador.detener')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {sesiones.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">{t('temporizador.sesionesRegistradas')}</CardTitle>
                <CardDescription>
                  {totalHoras.toFixed(1)}h · {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalFacturar)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sesiones.map(ses => (
                <div key={ses.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{ses.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {ses.horas.toFixed(2)}h × {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(ses.tarifaHora)}/h
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(ses.horas * ses.tarifaHora)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => eliminar(ses.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
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
