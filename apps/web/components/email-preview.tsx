'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Eye, EyeOff } from 'lucide-react'
import { PLACEHOLDER_DESCRIPTIONS, type PlantillaEmail } from '@/lib/plantillas-email'

interface EmailPreviewProps {
  plantilla: PlantillaEmail
  asuntoRenderizado: string
  cuerpoRenderizado: string
  onAsuntoChange?: (asunto: string) => void
  onCuerpoChange?: (cuerpo: string) => void
  editable?: boolean
}

function resaltarPlaceholders(texto: string): Array<{ texto: string; esPlaceholder: boolean; key: string }> {
  const partes: Array<{ texto: string; esPlaceholder: boolean; key: string }> = []
  const regex = /\{[^}]+\}/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      partes.push({ texto: texto.slice(lastIndex, match.index), esPlaceholder: false, key: `t-${lastIndex}` })
    }
    partes.push({ texto: match[0], esPlaceholder: true, key: `p-${match.index}` })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < texto.length) {
    partes.push({ texto: texto.slice(lastIndex), esPlaceholder: false, key: `t-${lastIndex}` })
  }

  return partes
}

function TextoResaltado({ texto, className }: { texto: string; className?: string }) {
  const partes = resaltarPlaceholders(texto)
  return (
    <span className={className}>
      {partes.map(p =>
        p.esPlaceholder ? (
          <Badge key={p.key} variant="secondary" className="mx-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-mono text-[11px]">
            {p.texto}
          </Badge>
        ) : (
          <span key={p.key}>{p.texto}</span>
        )
      )}
    </span>
  )
}

export function EmailPreview({ plantilla, asuntoRenderizado, cuerpoRenderizado, onAsuntoChange, onCuerpoChange, editable = false }: EmailPreviewProps) {
  const [editMode, setEditMode] = useState(false)
  const { t } = useLanguage()

  const placeholdersDisponibles = Object.entries(PLACEHOLDER_DESCRIPTIONS)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {placeholdersDisponibles.map(([placeholder, desc]) => (
            <Badge key={placeholder} variant="outline" className="text-[10px] font-mono" title={desc}>
              {placeholder}
            </Badge>
          ))}
        </div>
        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="h-7 text-xs shrink-0"
          >
            {editMode ? <Eye className="mr-1 h-3 w-3" aria-hidden="true" /> : <Pencil className="mr-1 h-3 w-3" aria-hidden="true" />}
            {editMode ? t('emailPreview.vistaPrevia') : t('emailPreview.editar')}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 border-b">
          <div className="text-xs text-muted-foreground mb-1">{t('emailPreview.asunto')}</div>
          {editMode && onAsuntoChange ? (
            <Input
              value={asuntoRenderizado}
              onChange={(e) => onAsuntoChange(e.target.value)}
              className="h-8 text-sm border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          ) : (
            <div className="text-sm font-medium">
              <TextoResaltado texto={asuntoRenderizado} />
            </div>
          )}
        </div>
        <CardContent className="p-0">
          {editMode && onCuerpoChange ? (
            <div className="p-4">
              <Label className="text-xs text-muted-foreground mb-1 block">{t('emailPreview.cuerpoEmail')}</Label>
              <Textarea
                value={cuerpoRenderizado}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onCuerpoChange(e.target.value)}
                rows={12}
                className="text-sm font-mono resize-none border-0 shadow-none focus-visible:ring-0"
              />
            </div>
          ) : (
            <pre className="p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
              <TextoResaltado texto={cuerpoRenderizado} />
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
