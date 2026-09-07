'use client'

import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface FileUploadProps {
  bucket: string
  path: string
  tipo: string
  accept?: string
  maxSizeMB?: number
  onUploadComplete?: (url: string, nombre: string) => void
  buttonText?: string
  className?: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const unidades = ['B', 'KB', 'MB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const index = Math.min(i, unidades.length - 1)
  const valor = bytes / Math.pow(k, index)
  return `${valor.toFixed(index === 0 ? 0 : 1)} ${unidades[index]}`
}

export function FileUpload({
  bucket,
  path,
  tipo,
  accept = '.pdf,.doc,.docx,.txt,.md,.jpg,.png',
  maxSizeMB = 50,
  onUploadComplete,
  buttonText = 'Subir archivo',
  className,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const maxBytes = maxSizeMB * 1024 * 1024

  function reset() {
    setFile(null)
    setError(null)
    setProgress(0)
    setSuccess(false)
  }

  const acceptProp = accept
  const maxSizeMBProp = maxSizeMB
  const buttonTextProp = buttonText

  function validateFile(selected: File): string | null {
    const ext = '.' + selected.name.split('.').pop()?.toLowerCase()
    const acceptedList = accept.split(',').map(a => a.trim().toLowerCase())
    if (!acceptedList.includes(ext)) {
      return t('fileUpload.tipoNoPermitido').replace('{accept}', accept)
    }
    if (selected.size > maxBytes) {
      return t('fileUpload.archivoExcedeTamano').replace('{maxSize}', String(maxSizeMB))
    }
    return null
  }

  function handleFile(selected: File) {
    setError(null)
    setSuccess(false)
    setProgress(0)
    const validationError = validateFile(selected)
    if (validationError) {
      setError(validationError)
      return
    }
    setFile(selected)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) handleFile(droppedFile)
  }

  async function handleUpload() {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      const supabase = createClient()

      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${path}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (userId) {
        const { error: dbError } = await supabase
          .from('documentos')
          .insert({
            id: crypto.randomUUID(),
            perfilId: userId,
            tipo,
            nombre: file.name,
            tamanoBytes: file.size,
            url: publicUrl,
          })

        if (dbError) throw dbError
      }

      clearInterval(interval)
      setProgress(100)
      setSuccess(true)

      onUploadComplete?.(publicUrl, file.name)
    } catch (err) {
      clearInterval(interval)
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? JSON.stringify(err)
      setError(message !== '{}' ? message : t('fileUpload.errorSubir'))
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        {!file ? (
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('fileUpload.arrastraArchivo')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('fileUpload.extensiones')}: {accept}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleInputChange}
              className="hidden"
              onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
            />
          </label>
        ) : null}
        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {file && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <File className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              {!uploading && !success && (
                <button
                  onClick={reset}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {progress}%
                  </span>
                </div>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>{t('fileUpload.archivoSubido')}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!uploading && !success && (
              <Button onClick={handleUpload} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                {buttonText}
              </Button>
            )}

            {success && (
              <Button variant="outline" onClick={reset} className="w-full">
                {t('fileUpload.subirOtro')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
