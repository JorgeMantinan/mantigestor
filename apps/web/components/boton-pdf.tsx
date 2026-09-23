'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { generarPDF } from '@/lib/pdf'
import { toast } from 'sonner'

interface BotonPDFProps {
  elementId: string
  filename: string
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  orientacion?: 'portrait' | 'landscape'
}

export function BotonPDF({
  elementId,
  filename,
  label = 'Exportar PDF',
  variant = 'outline',
  size = 'sm',
  orientacion = 'portrait',
}: BotonPDFProps) {
  const [generando, setGenerando] = useState(false)

  const handleExport = async () => {
    const element = document.getElementById(elementId)
    if (!element) return
    setGenerando(true)
    try {
      await generarPDF(element, filename, { orientacion })
    } catch (err) {
      console.error('Error generando PDF:', err)
      toast.error('No se pudo generar el PDF. Inténtalo de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={generando}
      data-pdf-exclude="true"
    >
      {generando ? (
        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-3 w-3" />
      )}
      {generando ? 'Generando...' : label}
    </Button>
  )
}
