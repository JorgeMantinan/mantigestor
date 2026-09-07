'use client'

import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, XCircle, Pencil } from 'lucide-react'
import type { ResultadoValidacion, CampoValidacion } from '@/lib/validar-documento'

interface ValidacionOcrProps {
  resultado: ResultadoValidacion
  onCorregir?: (campo: string, sugerencia?: string) => void
  compact?: boolean
}

function CampoEstado({ campo, t }: { campo: CampoValidacion; t: (key: string) => string }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
      !campo.valido
        ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
        : campo.advertencia
          ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/30'
          : 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30'
    }`}>
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <span className="mt-0.5 shrink-0">
          {!campo.valido ? (
            <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
          ) : campo.advertencia ? (
            <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{campo.etiqueta}</span>
            {!campo.valido && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t('validacionOcr.error')}</Badge>
            )}
            {campo.valido && campo.advertencia && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-300 text-yellow-700 dark:text-yellow-400">
                {t('validacionOcr.aviso')}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate" title={String(campo.valor ?? '')}>
            {campo.valor != null ? String(campo.valor) : <span className="text-muted-foreground italic">{t('validacionOcr.noDetectado')}</span>}
          </p>
          {campo.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{campo.error}</p>
          )}
          {campo.advertencia && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">{campo.advertencia}</p>
          )}
          {campo.sugerencia && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {t('validacionOcr.sugerencia')}: <span className="font-mono">{campo.sugerencia}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ValidacionOcr({ resultado, onCorregir, compact = false }: ValidacionOcrProps) {
  const totalCampos = resultado.campos.length
  const camposValidos = resultado.campos.filter(c => c.valido && !c.advertencia).length
  const camposConAdvertencia = resultado.campos.filter(c => c.valido && c.advertencia).length
  const camposConError = resultado.campos.filter(c => !c.valido).length
  const { t } = useLanguage()

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          {camposValidos}
        </span>
        {camposConAdvertencia > 0 && (
          <span className="flex items-center gap-1 text-yellow-600">
            <AlertTriangle className="h-3 w-3" />
            {camposConAdvertencia}
          </span>
        )}
        {camposConError > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            {camposConError}
          </span>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t('validacionOcr.validacionDocumento')}</CardTitle>
            <CardDescription>
              {resultado.valido
                ? t('validacionOcr.todosCamposValidos')
                : t('validacionOcr.erroresEncontrados').replace('{errores}', String(camposConError)).replace('{avisos}', String(camposConAdvertencia))
              }
            </CardDescription>
          </div>
          <Badge
            variant={resultado.valido ? 'default' : 'destructive'}
            className={resultado.valido ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {resultado.valido ? `${camposValidos}/${totalCampos} OK` : `${camposConError} errores`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {resultado.campos.map(campo => (
          <div key={campo.campo} className="flex items-center gap-2">
            <div className="flex-1">
              <CampoEstado campo={campo} t={t} />
            </div>
            {onCorregir && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-8 w-8 p-0"
                onClick={() => onCorregir(campo.campo, campo.sugerencia)}
                title={`${t('validacionOcr.corregir')} ${campo.etiqueta}`}
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}

        {resultado.errores.length > 0 && (
          <div className="rounded-md bg-red-50 p-3 dark:bg-red-950/30">
            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">{t('validacionOcr.errores')}</p>
            <ul className="space-y-0.5">
              {resultado.errores.map((e, i) => (
                <li key={i} className="text-xs text-red-600 dark:text-red-400">• {e}</li>
              ))}
            </ul>
          </div>
        )}

        {resultado.advertencias.length > 0 && (
          <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-950/30">
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">{t('validacionOcr.avisos')}</p>
            <ul className="space-y-0.5">
              {resultado.advertencias.map((a, i) => (
                <li key={i} className="text-xs text-yellow-600 dark:text-yellow-400">• {a}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
