'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'
import type { FormatoExtracto } from '@mantigestor/utils'
import { useLanguage } from '@/contexts/language-context'

const FORMATOS: { value: FormatoExtracto; label: string; banco: string }[] = [
  { value: 'csv_santander', label: 'CSV Santander', banco: 'Santander' },
  { value: 'csv_bbva', label: 'CSV BBVA', banco: 'BBVA' },
  { value: 'csv_caixabank', label: 'CSV Caixabank', banco: 'Caixabank' },
  { value: 'csv_sabadell', label: 'CSV Sabadell', banco: 'Sabadell' },
  { value: 'csv_bankia', label: 'CSV Bankia', banco: 'Bankia' },
  { value: 'generico', label: 'CSV Genérico', banco: 'Otro' },
]

interface Movimiento {
  fecha: string
  concepto: string
  importe: number
  tipo: 'ingreso' | 'gasto'
  saldo: number
  referencia: string | null
}

interface ResultadoImportacion {
  movimientos: Movimiento[]
  total: number
  ingresos: number
  gastos: number
}

export function ImportarExtractoPageClient() {
  const { t } = useLanguage()
  const [formato, setFormato] = useState<FormatoExtracto>('generico')
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setError(null)
    setResultado(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setCsvContent(content)
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const handleImport = useCallback(async () => {
    if (!csvContent) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/facturas/importar-extracto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvContent, formato }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? t('importarExtracto.errorImportar'))
        return
      }

      setResultado(data)
    } catch {
      setError(t('importarExtracto.errorConexion'))
    } finally {
      setLoading(false)
    }
  }, [csvContent, formato])

  const formatEuros = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)

  const handleReset = useCallback(() => {
    setCsvContent(null)
    setFileName(null)
    setResultado(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <Upload className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">{t('importarExtracto.titulo')}</h1>
          <p className="text-muted-foreground">
            {t('importarExtracto.subtitulo')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario de subida */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('importarExtracto.subirExtracto')}</CardTitle>
            <CardDescription>{t('importarExtracto.descripcionFormato')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('importarExtracto.formatoBanco')}</label>
              <select
                value={formato}
                onChange={(e) => setFormato(e.target.value as FormatoExtracto)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {FORMATOS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">{t('importarExtracto.archivoCsv')}</label>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
              />
              {fileName && (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {fileName}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={!csvContent || loading}
                className="flex-1"
              >
                {loading ? t('importarExtracto.importando') : t('importarExtracto.importar')}
              </Button>
              {csvContent && (
                <Button variant="outline" onClick={handleReset}>
                  {t('importarExtracto.limpiar')}
                </Button>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('importarExtracto.resultado')}</CardTitle>
            <CardDescription>
              {resultado
                ? `${resultado.total} ${t('importarExtracto.movimientosClasificados')}`
                : t('importarExtracto.subeCsv')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!resultado ? (
              <p className="text-sm text-muted-foreground">
                {t('importarExtracto.esperandoArchivo')}
              </p>
            ) : (
              <div className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{resultado.total}</p>
                    <p className="text-xs text-muted-foreground">{t('importarExtracto.movimientos')}</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-950">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{resultado.ingresos}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{t('importarExtracto.ingresos')}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-800 dark:bg-red-950">
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{resultado.gastos}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">{t('importarExtracto.gastos')}</p>
                  </div>
                </div>

                {/* Tabla de movimientos */}
                <div className="max-h-96 space-y-1 overflow-y-auto">
                  {resultado.movimientos.map((m, i) => (
                    <div
                      key={`${m.fecha}-${i}`}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex items-center gap-3">
                        {m.tipo === 'ingreso' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{m.concepto}</p>
                          <p className="text-xs text-muted-foreground">{m.fecha}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        m.tipo === 'ingreso'
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {m.tipo === 'ingreso' ? '+' : ''}{formatEuros(m.importe)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
