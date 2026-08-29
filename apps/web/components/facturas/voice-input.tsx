'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { UseSpeechRecognitionReturn } from '@/hooks/use-speech-recognition'

interface Props {
  speech: UseSpeechRecognitionReturn
  parseandoVoz: boolean
  onParsear: () => void
  compact?: boolean
}

export const VoiceInput = memo(function VoiceInput({ speech, parseandoVoz, onParsear, compact }: Props) {
  if (!speech.soportado) return null

  return (
    <div className="space-y-2">
      <p className={compact ? 'text-xs font-medium' : 'text-sm font-medium'}>Entrada por voz</p>
      <div className="flex gap-2">
        {!speech.escuchando ? (
          <Button type="button" size="sm" onClick={speech.iniciar}>
            {compact ? 'Hablar' : 'Empezar a hablar'}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="destructive" onClick={speech.parar}>Detener</Button>
        )}
        {speech.transcripcion && (
          <Button type="button" size="sm" variant="ghost" onClick={speech.limpiar}>Borrar</Button>
        )}
      </div>
      {speech.escuchando && <p className={compact ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>Escuchando...</p>}
      {(speech.transcripcion || speech.transcripcionInterina) && (
        <p className={compact ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>
          {speech.transcripcion}{speech.transcripcionInterina}
        </p>
      )}
      {speech.error && <p className="text-xs text-destructive">{speech.error}</p>}
      {speech.transcripcion && (
        <Button type="button" size="sm" onClick={onParsear} disabled={parseandoVoz}>
          {parseandoVoz ? 'Procesando...' : 'Auto-rellenar desde el audio'}
        </Button>
      )}
    </div>
  )
})
