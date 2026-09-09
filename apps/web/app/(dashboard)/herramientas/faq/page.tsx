'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send, Sparkles, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'

interface FaqItem {
  pregunta: string
  respuesta: string
}

interface Categoria {
  nombre: string
  items: FaqItem[]
}

const FAQ_DATA: Categoria[] = [
  {
    nombre: 'IVA',
    items: [
      { pregunta: '¿Qué tipos de IVA existen en España?', respuesta: 'Existen tres tipos: General (21%), Reducido (10%) y Superreducido (4%). El tipo general se aplica a la mayoría de bienes y servicios. El reducido a alimentos, hostelería y transportes. El superreducido a productos básicos como pan, leche, libros y medicamentos.' },
      { pregunta: '¿Cómo declaro el IVA trimestralmente (Modelo 303)?', respuesta: 'El Modelo 303 se presenta trimestralmente (antes del día 20 del mes siguiente al trimestre). Calculas el IVA repercutido (cobrado) menos el IVA soportado (pagado). Si el resultado es positivo, ingresas; si es negativo, compensas o solicitas devolución. En MantiGestor puedes auto-generarlo desde la sección Fiscal.' },
      { pregunta: '¿Qué gastos puedo deducir el IVA?', respuesta: 'Puedes deducir el IVA de gastos relacionados directamente con tu actividad: material de oficina, alquiler de local, servicios profesionales, equipamiento, combustible (si es deductible), etc. No es deducible el IVA de gastos personales ni de comidas (excepto gastos de representación con límites).' },
      { pregunta: '¿Cuándo puedo solicitar la devolución del IVA?', respuesta: 'Si durante un trimestre el IVA soportado supera al repercutido, puedes solicitar la devolución en el Modelo 303 (casilla 71) o compensarlo en trimestres siguientes. Para autónomos en recargo de equivalencia o归arán en módulos existen reglas especiales.' },
    ],
  },
  {
    nombre: 'IRPF',
    items: [
      { pregunta: '¿Qué son los pagos fraccionados del IRPF?', respuesta: 'Son anticipos del IRPF que los autónomos deben hacer trimestralmente (Modelo 130). Se calculan sobre los ingresos menos gastos del trimestre, aplicando un porcentaje (generalmente 20% o 15% si Estimación Objetiva). Se presentan junto con el Modelo 303.' },
      { pregunta: '¿Cómo afecta el IRPF a mis facturas?', respuesta: 'Cuando emites facturas a empresas, estas retienen un porcentaje de IRPF (15% para autónomos, 7% en los dos primeros años). Esa retención es un pago a cuenta de tu declaración anual. Debes reflejarla en tus ingresos y en el Modelo 111/180.' },
      { pregunta: '¿Qué gastos son deducibles en el IRPF?', respuesta: 'Son deducibles los gastos necesarios para tu actividad: seguros, suministros (5% del rendimiento neto si trabajas desde casa), formación, suscripciones profesionales, alquiler de local, amortización, etc. No son deducibles multas, sanciones ni gastos personales.' },
      { pregunta: '¿Cómo presento la Declaración de la Renta (Modelo 100)?', respuesta: 'La declaración anual del IRPF (Modelo 100) se presenta entre abril y junio. Puedes hacerlaonline con certificado digital. En MantiGestor puedes simular tu resultado fiscal con el Modelo 100 y exportar los datos para la declaración.' },
    ],
  },
  {
    nombre: 'Modelo 303',
    items: [
      { pregunta: '¿Qué es el Modelo 303 y cuándo se presenta?', respuesta: 'El Modelo 303 es la declaración trimestral del IVA. Se presenta los días 1-20 de abril, julio, octubre y enero. Registra el IVA repercutido (facturado) y soportado (gastos con IVA). El resultado se ingresa o compensa.' },
      { pregunta: '¿Cómo calculo el resultado del Modelo 303?', respuesta: 'Resultado = IVA Repercutido (total IVA de tus facturas de venta) - IVA Soportado (total IVA de tus gastos deducibles). Si el resultado es positivo, pagas; si es negativo, compensas trimestres siguientes (máximo 4 trimestres) o pides devolución.' },
      { pregunta: '¿Qué pasa si no presento el Modelo 303 a tiempo?', respuesta: 'Hacienda aplica sanciones del 5% sobre el resultado no ingresado por cada mes de retraso (mínimo 100€). También puede bloquear tu NIF. Es fundamental presentarlo en plazo aunque el resultado sea cero o negativo (declaración negativa).' },
    ],
  },
  {
    nombre: 'Facturación',
    items: [
      { pregunta: '¿Qué debe contener una factura según la normativa española?', respuesta: 'Una factura debe incluir: número y serie, fecha de expedición, NIF del emisor y receptor, nombre completo, descripción de la operación, base imponible, tipo impositivo (IVA), cuota tributaria, total, y si es subjecta a retención de IRPF. Para facturas electrónicas (SII), deben incluir additionally el XML normalizado.' },
      { pregunta: '¿Cuándo debo emitir factura?', respuesta: 'Siempre que realices una actividad económica y factures a empresas, profesionales o autónomos. Para consumidores finales, solo si te lo solicitan. Hay excepciones para determinadas actividades y operaciones intracomunitarias.' },
      { pregunta: '¿Qué es una factura rectificativa?', respuesta: 'Es una factura que modifica o anula una factura anterior. Se usa para corregir errores, aplicar descuentos o devoluciones. Debe referenciar la factura original, indicar la diferencia y marcar si es de abono (crédito) o recargo (débito).' },
    ],
  },
  {
    nombre: 'Nóminas',
    items: [
      { pregunta: '¿Qué retenciones se aplican en una nómina?', respuesta: 'Las principales retenciones son: IRPF (según tabla general: 19-47%), Seguridad Social del trabajador (6,4% general), y aportaciones del empresa (23,6% general). Para empleados del hogar aplican tipos reducidos y bonificaciones.' },
      { pregunta: '¿Cómo doy de alta a un empleado del hogar?', respuesta: 'Debes registrarte en el Sistema Especial de Empleados del Hogar de la Seguridad Social, comunicar el alta en el plazo de 30 días, y presentar los partes de alta/baja. En MantiGestor puedes generar nóminas y calcular las cuotas automáticamente.' },
      { pregunta: '¿Qué obligaciones tengo como empleador del hogar?', respuesta: 'Retener IRPF, cotizar a la Seguridad Social, facilitar nóminas, comunicar altas/bajas, y presentar declaraciones trimestrales (Modelo 111) y anuales (Modelo 190). Si la nómina supera los 15.000€ anuales, también Modelo 193.' },
    ],
  },
]

export default function FaqPage() {
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [preguntaIA, setPreguntaIA] = useState('')
  const [respuestaIA, setRespuestaIA] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [historial, setHistorial] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historial])

  const toggleCategoria = (nombre: string) => {
    setCategoriaActiva(prev => prev === nombre ? null : nombre)
  }

  const preguntarIA = async () => {
    if (!preguntaIA.trim() || loadingIA) return
    const pregunta = preguntaIA.trim()
    setPreguntaIA('')
    setHistorial(prev => [...prev, { role: 'user', content: pregunta }])
    setLoadingIA(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: `Pregunta desde la sección FAQ: ${pregunta}`,
          historial: historial.slice(-4),
        }),
      })
      if (!res.ok) throw new Error('Error')
      const { respuesta } = await res.json()
      setHistorial(prev => [...prev, { role: 'assistant', content: respuesta }])
      setRespuestaIA(respuesta)
    } catch {
      setHistorial(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error. Por favor, inténtalo de nuevo.' }])
      setRespuestaIA('Lo siento, hubo un error. Por favor, inténtalo de nuevo.')
    }
    setLoadingIA(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Preguntas Frecuentes</h1>
        <p className="text-muted-foreground">Respuestas a las dudas fiscales más comunes</p>
      </div>

      {/* FAQ por categorías */}
      <div className="space-y-3">
        {FAQ_DATA.map(cat => (
          <Card key={cat.nombre}>
            <button
              className="w-full text-left"
              onClick={() => toggleCategoria(cat.nombre)}
            >
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{cat.nombre}</CardTitle>
                {categoriaActiva === cat.nombre
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
              </CardHeader>
            </button>
            {categoriaActiva === cat.nombre && (
              <CardContent className="space-y-4 pt-0">
                {cat.items.map((item, i) => (
                  <details key={i} className="group rounded-lg border p-3">
                    <summary className="cursor-pointer font-medium text-sm flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                      {item.pregunta}
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed pl-6">
                      {item.respuesta}
                    </p>
                  </details>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* IA Chat */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Preguntar a la IA</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {historial.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-3">
              {historial.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loadingIA && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
                    <span className="animate-pulse">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Escribe tu pregunta fiscal..."
              value={preguntaIA}
              onChange={e => setPreguntaIA(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && preguntarIA()}
              disabled={loadingIA}
            />
            <Button onClick={preguntarIA} disabled={loadingIA || !preguntaIA.trim()} aria-label="Enviar pregunta">
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
