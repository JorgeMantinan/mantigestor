'use client'

import { useState, useRef } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface FacturaCSV {
  tipo: string
  emisorReceptor: string
  nifContraparte: string
  fechaEmision: string
  baseImponible: string
  iva: string
  estado: string
}

interface ResultadoImportacion {
  exitosas: number
  fallidas: number
  errores: string[]
}

function parsearCSV(texto: string): FacturaCSV[] {
  const lineas = texto.split('\n').filter(l => l.trim())
  if (lineas.length < 2) return []

  const encabezados = lineas[0]!.split(';').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const facturas: FacturaCSV[] = []

  for (let i = 1; i < lineas.length; i++) {
    const valores = lineas[i]!.split(';').map(v => v.trim().replace(/"/g, ''))
    if (valores.length < encabezados.length) continue

    const fila: Record<string, string> = {}
    encabezados.forEach((h, idx) => { fila[h] = valores[idx] ?? '' })

    facturas.push({
      tipo: fila['tipo'] ?? fila['type'] ?? 'gasto',
      emisorReceptor: fila['contraparte'] ?? fila['emisorreceptor'] ?? fila['counterparty'] ?? '',
      nifContraparte: fila['nif'] ?? fila['nifcontraparte'] ?? fila['tax_id'] ?? '',
      fechaEmision: fila['fecha'] ?? fila['fechaemision'] ?? fila['date'] ?? new Date().toISOString().slice(0, 10),
      baseImponible: fila['base'] ?? fila['baseimponible'] ?? fila['base_amount'] ?? '0',
      iva: fila['iva'] ?? fila['vat'] ?? '21',
      estado: fila['estado'] ?? fila['status'] ?? 'pendiente',
    })
  }

  return facturas
}

export function ImportarFacturasCSV({ onImportadas }: { onImportadas: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<FacturaCSV[]>([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file)
    setResultado(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const texto = ev.target?.result as string
      const facturas = parsearCSV(texto)
      setVistaPrevia(facturas.slice(0, 10))
    }
    reader.readAsText(file)
  }

  const importar = async () => {
    if (!archivo) return
    setImportando(true)

    try {
      const texto = await archivo.text()
      const facturas = parsearCSV(texto)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error(t('importarFacturasCsv.noAutenticado')); setImportando(false); return }

      const { data: perfil } = await supabase.from('perfiles').select('id').eq('userId', user.id).single()
      if (!perfil) { toast.error(t('importarFacturasCsv.noAutenticado')); setImportando(false); return }

      let exitosas = 0
      let fallidas = 0
      const errores: string[] = []

      for (const f of facturas) {
        const base = Math.round(parseFloat(f.baseImponible.replace(',', '.')) * 100)
        const iva = parseFloat(f.iva.replace(',', '.')) || 21
        const importeIva = Math.round(base * (iva / 100))
        const total = base + importeIva

        const { error } = await supabase.from('facturas').insert({
          id: crypto.randomUUID(),
          perfilId: perfil.id,
          numero: `IMP-${Date.now()}-${exitosas}`,
          tipo: f.tipo === 'ingreso' ? 'ingreso' : 'gasto',
          emisorReceptor: f.emisorReceptor,
          nifContraparte: f.nifContraparte || null,
          fechaEmision: f.fechaEmision,
          baseImponible: base,
          iva: iva,
          total: total,
          estado: f.estado === 'pagada' ? 'pagada' : 'pendiente',
        })

        if (error) {
          fallidas++
          errores.push(`${f.emisorReceptor}: ${error.message}`)
        } else {
          exitosas++
        }
      }

      setResultado({ exitosas, fallidas, errores })
      if (exitosas > 0) {
        toast.success(`${exitosas} facturas importadas`)
        onImportadas()
      }
    } catch {
      toast.error(t('importarFacturasCsv.errorProcesar'))
    }

    setImportando(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Upload className="h-4 w-4" /> {t('importarFacturasCsv.importarFacturasCsv')}
        </CardTitle>
        <CardDescription>{t('importarFacturasCsv.formato')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={inputRef} type="file" accept=".csv,.txt" onChange={handleArchivo} className="hidden" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <FileText className="mr-1 h-3 w-3" /> {t('importarFacturasCsv.seleccionarArchivo')}
          </Button>
          {archivo && (
            <Button size="sm" onClick={() => void importar()} disabled={importando || vistaPrevia.length === 0}>
              {importando ? t('importarFacturasCsv.importando') : t('importarFacturasCsv.importarFacturas').replace('{count}', String(vistaPrevia.length))}
            </Button>
          )}
        </div>

        {vistaPrevia.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {t('importarFacturasCsv.vistaPrevia').replace('{count}', String(vistaPrevia.length))}{vistaPrevia.length === 10 ? t('importarFacturasCsv.mostrandoPrimeras10') : ''}
          </div>
        )}

        {resultado && (
          <div className={`rounded-lg border p-3 text-sm ${resultado.fallidas > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              {resultado.fallidas > 0 ? <AlertCircle className="h-4 w-4 text-yellow-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
              <span className="font-medium">
                {resultado.exitosas} {t('importarFacturasCsv.exitosas')}{resultado.fallidas > 0 ? `, ${resultado.fallidas} ${t('importarFacturasCsv.fallidas')}` : ''}
              </span>
            </div>
            {resultado.errores.length > 0 && (
              <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                {resultado.errores.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
