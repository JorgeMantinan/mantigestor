'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generarFirmaBase64 } from '@/lib/firma-digital'

interface FirmaCanvasProps {
  onFirmaGuardada: (base64: string) => void
  nombreInicial?: string
}

export function FirmaCanvas({ onFirmaGuardada, nombreInicial = '' }: FirmaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [dibujando, setDibujando] = useState(false)
  const [nombre, setNombre] = useState(nombreInicial)
  const [tieneTrazos, setTieneTrazos] = useState(false)
  const trazosRef = useRef<{ x: number; y: number }[][]>([])
  const trazoActualRef = useRef<{ x: number; y: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(2, 2)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctxRef.current = ctx
  }, [])

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return { x: 0, y: 0 }
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const iniciarDibujo = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    trazoActualRef.current = [pos]
    setDibujando(true)
    setTieneTrazos(true)
  }, [getPos])

  const dibujar = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dibujando || !ctxRef.current) return
    e.preventDefault()
    const pos = getPos(e)
    trazoActualRef.current.push(pos)

    const ctx = ctxRef.current
    ctx.beginPath()
    const prev = trazoActualRef.current[trazoActualRef.current.length - 2] ?? pos
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [dibujando, getPos])

  const finDibujo = useCallback(() => {
    if (trazoActualRef.current.length > 0) {
      trazosRef.current.push([...trazoActualRef.current])
      trazoActualRef.current = []
    }
    setDibujando(false)
  }, [])

  const deshacer = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx || trazosRef.current.length === 0) return

    trazosRef.current.pop()

    ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2)

    for (const trazo of trazosRef.current) {
      if (trazo.length < 1) continue
      const first = trazo[0]
      if (!first) continue
      ctx.beginPath()
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < trazo.length; i++) {
        const p = trazo[i]
        if (!p) continue
        ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }

    setTieneTrazos(trazosRef.current.length > 0)
  }, [])

  const limpiar = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2)
    trazosRef.current = []
    trazoActualRef.current = []
    setTieneTrazos(false)
  }, [])

  const guardar = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !tieneTrazos) return
    const base64 = generarFirmaBase64(canvas)
    onFirmaGuardada(base64)
  }, [tieneTrazos, onFirmaGuardada])

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="firma-nombre">Nombre para la firma</Label>
        <Input
          id="firma-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre completo"
        />
      </div>
      <div className="space-y-2">
        <Label>Dibuja tu firma</Label>
        <div className="relative rounded-md border border-dashed bg-white" style={{ height: 120 }}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
            onMouseDown={iniciarDibujo}
            onMouseMove={dibujar}
            onMouseUp={finDibujo}
            onMouseLeave={finDibujo}
            onTouchStart={iniciarDibujo}
            onTouchMove={dibujar}
            onTouchEnd={finDibujo}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={deshacer} disabled={trazosRef.current.length === 0}>
          Deshacer
        </Button>
        <Button variant="outline" size="sm" onClick={limpiar} disabled={!tieneTrazos}>
          Limpiar
        </Button>
        <Button size="sm" onClick={guardar} disabled={!tieneTrazos || !nombre.trim()}>
          Guardar firma
        </Button>
      </div>
    </div>
  )
}
