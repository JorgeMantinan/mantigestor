'use client'

import { useEffect, useState, useMemo } from 'react'
import { obtenerEventosTimeline, type EventoTimeline, type TipoEvento } from '@/lib/timeline-events'
import {
  FileText,
  Pencil,
  ArrowRightLeft,
  ScanLine,
  Mail,
  Download,
  Trash2,
  Layers,
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface TimelineFacturaProps {
  facturaId: string
}

const ICONOS: Record<TipoEvento, React.ReactNode> = {
  creada: <FileText className="h-4 w-4" />,
  editada: <Pencil className="h-4 w-4" />,
  estado_cambiado: <ArrowRightLeft className="h-4 w-4" />,
  ocr: <ScanLine className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  pdf_descargada: <Download className="h-4 w-4" />,
  conciliada: <Layers className="h-4 w-4" />,
  eliminada: <Trash2 className="h-4 w-4" />,
}

const COLORES: Record<TipoEvento, string> = {
  creada: 'bg-green-500',
  editada: 'bg-blue-500',
  estado_cambiado: 'bg-yellow-500',
  ocr: 'bg-purple-500',
  email: 'bg-orange-500',
  pdf_descargada: 'bg-teal-500',
  conciliada: 'bg-cyan-500',
  eliminada: 'bg-red-500',
}

const ICON_COLORS: Record<TipoEvento, string> = {
  creada: 'text-green-600 dark:text-green-400',
  editada: 'text-blue-600 dark:text-blue-400',
  estado_cambiado: 'text-yellow-600 dark:text-yellow-400',
  ocr: 'text-purple-600 dark:text-purple-400',
  email: 'text-orange-600 dark:text-orange-400',
  pdf_descargada: 'text-teal-600 dark:text-teal-400',
  conciliada: 'text-cyan-600 dark:text-cyan-400',
  eliminada: 'text-red-600 dark:text-red-400',
}

const _ETIQUETAS: Record<TipoEvento, string> = {
  creada: 'Creada',
  editada: 'Editada',
  estado_cambiado: 'Estado cambiado',
  ocr: 'OCR',
  email: 'Email enviado',
  pdf_descargada: 'PDF descargado',
  conciliada: 'Conciliada',
  eliminada: 'Eliminada',
}

function agruparPorFecha(eventos: EventoTimeline[]): Map<string, EventoTimeline[]> {
  const grupos = new Map<string, EventoTimeline[]>()
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)
  const semana = new Date(hoy)
  semana.setDate(semana.getDate() - 7)

  for (const evento of eventos) {
    const fecha = new Date(evento.fecha)
    fecha.setHours(0, 0, 0, 0)
    let clave: string

    if (fecha.getTime() === hoy.getTime()) {
      clave = 'Hoy'
    } else if (fecha.getTime() === ayer.getTime()) {
      clave = 'Ayer'
    } else if (fecha > semana) {
      clave = 'Esta semana'
    } else {
      clave = 'Anteriores'
    }

    const grupo = grupos.get(clave)
    if (grupo) {
      grupo.push(evento)
    } else {
      grupos.set(clave, [evento])
    }
  }

  return grupos
}

function DetalleCambios({ antes, despues }: { antes: Record<string, unknown> | null; despues: Record<string, unknown> | null }) {
  if (!antes && !despues) return null

  const CAMPOS_LABELS: Record<string, string> = {
    estado: 'Estado',
    numero: 'Nº factura',
    emisorReceptor: 'Contraparte',
    nifContraparte: 'NIF/CIF',
    baseImponible: 'Base imponible',
    iva: 'IVA',
    total: 'Total',
    tipo: 'Tipo',
    fechaEmision: 'Fecha emisión',
    fechaVencimiento: 'Vencimiento',
    notas: 'Notas',
  }

  const diffs: Array<{ campo: string; de: string; a: string }> = []

  if (antes && despues) {
    for (const key of Object.keys(despues)) {
      const oldVal = antes[key]
      const newVal = despues[key]
      if (String(oldVal) !== String(newVal)) {
        diffs.push({
          campo: CAMPOS_LABELS[key] ?? key,
          de: String(oldVal ?? '—'),
          a: String(newVal ?? '—'),
        })
      }
    }
  } else if (antes) {
    for (const [key, val] of Object.entries(antes)) {
      diffs.push({
        campo: CAMPOS_LABELS[key] ?? key,
        de: String(val ?? '—'),
        a: '(eliminado)',
      })
    }
  } else if (despues) {
    for (const [key, val] of Object.entries(despues)) {
      if (key === 'id' || key === 'perfilId' || key === 'createdAt') continue
      diffs.push({
        campo: CAMPOS_LABELS[key] ?? key,
        de: '(nuevo)',
        a: String(val ?? '—'),
      })
    }
  }

  if (diffs.length === 0) return null

  return (
    <div className="mt-1.5 rounded-md border border-muted bg-muted/30 px-2.5 py-1.5 text-xs space-y-1">
      {diffs.map((d) => (
        <div key={d.campo} className="flex items-center gap-1.5">
          <span className="font-medium text-muted-foreground min-w-[80px]">{d.campo}:</span>
          {d.de !== '(nuevo)' && (
            <span className="line-through text-muted-foreground/70">{d.de}</span>
          )}
          {d.de !== '(nuevo)' && <span className="text-muted-foreground">→</span>}
          <span className="font-medium">{d.a}</span>
        </div>
      ))}
    </div>
  )
}

export function TimelineFactura({ facturaId }: TimelineFacturaProps) {
  const [eventos, setEventos] = useState<EventoTimeline[]>([])
  const [cargando, setCargando] = useState(true)
  const { t } = useLanguage()

  const etiquetasTraducidas: Record<TipoEvento, string> = {
    creada: t('timeline.creada'),
    editada: t('timeline.editada'),
    estado_cambiado: t('timeline.estadoCambiado'),
    ocr: t('timeline.ocr'),
    email: t('timeline.emailEnviado'),
    pdf_descargada: t('timeline.pdfDescargado'),
    conciliada: t('timeline.conciliada'),
    eliminada: t('timeline.eliminada'),
  }

  useEffect(() => {
    const cargar = async () => {
      const data = await obtenerEventosTimeline(facturaId)
      setEventos(data)
      setCargando(false)
    }
    void cargar()
  }, [facturaId])

  const agrupados = useMemo(() => agruparPorFecha(eventos), [eventos])

  const gruposTraducidos: Record<string, string> = {
    'Hoy': t('timeline.hoy'),
    'Ayer': t('timeline.ayer'),
    'Esta semana': t('timeline.estaSemana'),
    'Anteriores': t('timeline.anteriores'),
  }

  if (cargando) return <p className="text-xs text-muted-foreground">{t('timeline.cargando')}</p>
  if (eventos.length === 0) return <p className="text-xs text-muted-foreground">{t('timeline.sinEventos')}</p>

  return (
    <div className="space-y-4">
      {Array.from(agrupados.entries()).map(([grupo, eventosGrupo]) => (
        <div key={grupo}>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">{gruposTraducidos[grupo] ?? grupo}</p>
          <div className="relative ml-3 border-l-2 border-muted pl-6 space-y-3">
            {eventosGrupo.map((evento) => (
              <div key={evento.id} className="relative">
                <div className={`absolute -left-[31px] top-0 rounded-full p-0.5 ${COLORES[evento.tipo]}`}>
                  <span className="text-white">{ICONOS[evento.tipo]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${ICON_COLORS[evento.tipo]}`}>
                      {etiquetasTraducidas[evento.tipo]}
                    </span>
                    {evento.tipo === 'estado_cambiado' && evento.antes && evento.despues && (
                      <span className="text-xs text-muted-foreground">
                        {' '}
                        {String(evento.antes['estado'] ?? '—')}
                        {' → '}
                        {String(evento.despues['estado'] ?? '—')}
                      </span>
                    )}
                  </div>
                  {evento.titulo && evento.tipo !== 'estado_cambiado' && (
                    <p className="text-xs text-muted-foreground">{evento.titulo}</p>
                  )}
                  <DetalleCambios antes={evento.antes} despues={evento.despues} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(evento.fecha).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
