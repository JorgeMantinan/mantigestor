'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Landmark,
  Download,
  ExternalLink,
  FileSignature,
  Upload,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  AlertTriangle,
  KeyRound,
} from 'lucide-react'
import {
  exportarModelo303,
  exportarModelo111,
  exportarModelo130,
  exportarModelo100,
  abrirSedeElectronica,
  descargarModelo,
  type Modelo303Data,
  type Modelo111Data,
  type Modelo130Data,
  type Modelo100Data,
  type ModeloExportResult,
} from '@/lib/hacienda-export'
import { firmarDatos, esCertificadoValido, type CertificadoInfo } from '@/lib/hacienda-firma'

type EstadoModelo = 'borrador' | 'listo' | 'firmado' | 'enviado' | 'presentado'

interface ModeloPreparado {
  id: string
  modelo: string
  nombre: string
  ejercicio: number
  periodo: string
  estado: EstadoModelo
  fechaLimite: string
  importe: number
  tipo: 'a_pagar' | 'a_devolver' | 'cero'
}

const MODELOS_EJEMPLO: ModeloPreparado[] = [
  {
    id: '1',
    modelo: '303',
    nombre: 'IVA Trimestral',
    ejercicio: 2026,
    periodo: 'T2',
    estado: 'listo',
    fechaLimite: '2026-07-30',
    importe: 4521.30,
    tipo: 'a_pagar',
  },
  {
    id: '2',
    modelo: '111',
    nombre: 'Retenciones Trimestral',
    ejercicio: 2026,
    periodo: 'T2',
    estado: 'borrador',
    fechaLimite: '2026-07-30',
    importe: 1234.56,
    tipo: 'a_pagar',
  },
  {
    id: '3',
    modelo: '130',
    nombre: 'Pago Fraccionado IRPF',
    ejercicio: 2026,
    periodo: 'T2',
    estado: 'borrador',
    fechaLimite: '2026-07-30',
    importe: -890.25,
    tipo: 'a_devolver',
  },
]

function formatEuro(v: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

function estadoBadge(estado: EstadoModelo) {
  const styles: Record<EstadoModelo, string> = {
    borrador: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    listo: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    firmado: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    enviado: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    presentado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }
  const labels: Record<EstadoModelo, string> = {
    borrador: 'Borrador',
    listo: 'Listo',
    firmado: 'Firmado',
    enviado: 'Enviado',
    presentado: 'Presentado',
  }
  return (
    <Badge className={styles[estado]}>
      {estado === 'presentado' && <CheckCircle className="mr-1 h-3 w-3" />}
      {estado === 'borrador' && <Clock className="mr-1 h-3 w-3" />}
      {labels[estado]}
    </Badge>
  )
}

export default function HaciendaPage() {
  const [modelos, setModelos] = useState<ModeloPreparado[]>(MODELOS_EJEMPLO)
  const [exportando, setExportando] = useState<string | null>(null)
  const [firmaModal, setFirmaModal] = useState<ModeloPreparado | null>(null)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certPassword, setCertPassword] = useState('')
  const [certInfo, setCertInfo] = useState<CertificadoInfo | null>(null)
  const [firmando, setFirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExportar = useCallback(async (modelo: ModeloPreparado) => {
    setExportando(modelo.id)
    try {
      await new Promise(r => setTimeout(r, 500))

      let resultado: ModeloExportResult
      switch (modelo.modelo) {
        case '303':
          resultado = exportarModelo303({
            nif: '12345678A',
            nombre: 'Autónomo Ejemplo',
            ejercicio: modelo.ejercicio,
            trimestre: parseInt(modelo.periodo.replace('T', '')) as 1 | 2 | 3 | 4,
            base21: 1500000, base10: 0, base4: 0, base0: 0,
            iva21: 315000, iva10: 0, iva4: 0, ivaTotal: 315000,
            baseSoportada21: 800000, baseSoportada10: 0, baseSoportada4: 0,
            ivaSoportado: 168000, resultado: 147000,
          })
          break
        case '111':
          resultado = exportarModelo111({
            nif: '12345678A',
            nombre: 'Autónomo Ejemplo',
            ejercicio: modelo.ejercicio,
            trimestre: parseInt(modelo.periodo.replace('T', '')) as 1 | 2 | 3 | 4,
            retencionesTrabajo: 80000, retencionesActividades: 43456,
            retencionesPredial: 0, totalRetenciones: 123456,
          })
          break
        case '130':
          resultado = exportarModelo130({
            nif: '12345678A',
            nombre: 'Autónomo Ejemplo',
            ejercicio: modelo.ejercicio,
            trimestre: parseInt(modelo.periodo.replace('T', '')) as 1 | 2 | 3 | 4,
            ingresos: 2000000, gastos: 890000, resultado: 1110000,
            pagosFraccionados: 200000, totalADevolver: -89025,
          })
          break
        case '100':
          resultado = exportarModelo100({
            nif: '12345678A',
            nombre: 'Autónomo Ejemplo',
            ejercicio: modelo.ejercicio,
            baseImponible: 3500000, cuotaIntegra: 1050000,
            retenciones: 980000, pagosFraccionados: 200000, resultado: -130000,
          })
          break
        default:
          throw new Error(`Modelo ${modelo.modelo} no soportado`)
      }

      descargarModelo(resultado)
      setModelos(prev => prev.map(m => m.id === modelo.id ? { ...m, estado: 'listo' } : m))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExportando(null)
    }
  }, [])

  const handleAbrirSede = useCallback((modelo: ModeloPreparado) => {
    abrirSedeElectronica(modelo.modelo, '12345678A', modelo.ejercicio)
  }, [])

  const handleFirmar = useCallback(async () => {
    if (!certFile || !certPassword || !firmaModal) return
    setFirmando(true)
    setError(null)

    try {
      const datosModelo = JSON.stringify({
        modelo: firmaModal.modelo,
        ejercicio: firmaModal.ejercicio,
        periodo: firmaModal.periodo,
        nif: '12345678A',
        estado: 'pendiente',
      })

      const resultado = await firmarDatos(datosModelo, certFile, certPassword)
      setCertInfo(resultado.certificado)
      setModelos(prev => prev.map(m =>
        m.id === firmaModal.id ? { ...m, estado: 'firmado' } : m
      ))
      setFirmaModal(null)
      setCertFile(null)
      setCertPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al firmar')
    } finally {
      setFirmando(false)
    }
  }, [certFile, certPassword, firmaModal])

  const handleEnviar = useCallback((modelo: ModeloPreparado) => {
    setModelos(prev => prev.map(m =>
      m.id === modelo.id ? { ...m, estado: 'enviado' } : m
    ))
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6" />
          Hacienda — Presentación de Modelos
        </h1>
        <p className="text-muted-foreground">
          Exporta, firma y presenta tus modelos fiscales a la Agencia Tributaria
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:bg-red-950 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setError(null)}>
            Cerrar
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {modelos.map(modelo => (
          <Card key={modelo.id}>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">Modelo {modelo.modelo}</span>
                    {estadoBadge(modelo.estado)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {modelo.nombre} · {modelo.ejercicio} {modelo.periodo}
                  </p>
                  <p className="text-sm">
                    Importe: <span className={`font-semibold ${modelo.tipo === 'a_devolver' ? 'text-green-600' : 'text-foreground'}`}>
                      {modelo.tipo === 'a_devolver' ? '+' : ''}{formatEuro(modelo.importe)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Límite: {new Date(modelo.fechaLimite).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportar(modelo)}
                    disabled={exportando === modelo.id || modelo.estado === 'presentado'}
                  >
                    {exportando === modelo.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Exportar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAbrirSede(modelo)}
                    disabled={modelo.estado === 'presentado'}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Sede Electrónica
                  </Button>

                  {(modelo.estado === 'listo' || modelo.estado === 'borrador') && (
                    <Button
                      size="sm"
                      onClick={() => setFirmaModal(modelo)}
                    >
                      <FileSignature className="mr-1.5 h-3.5 w-3.5" />
                      Firmar y enviar
                    </Button>
                  )}

                  {modelo.estado === 'firmado' && (
                    <Button
                      size="sm"
                      onClick={() => handleEnviar(modelo)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Enviar
                    </Button>
                  )}

                  {modelo.estado === 'enviado' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModelos(prev => prev.map(m =>
                        m.id === modelo.id ? { ...m, estado: 'presentado' } : m
                      ))}
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      Marcar presentado
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {modelos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay modelos preparados</p>
            <p className="text-muted-foreground text-sm">
              Los modelos fiscales aparecerán aquí cuando estén calculados
            </p>
          </CardContent>
        </Card>
      )}

      {/* Firma Modal */}
      {firmaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Firmar Modelo {firmaModal.modelo}
              </CardTitle>
              <CardDescription>
                Sube tu certificado digital para firmar la declaración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {certInfo && (
                <div className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-950">
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Certificado cargado: {certInfo.alias}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Válido hasta {new Date(certInfo.fechaFin).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Certificado digital (PKCS#12 / PFX)</Label>
                <div>
                  <label htmlFor="cert-upload">
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        {certFile ? certFile.name : 'Seleccionar archivo .pfx / .p12'}
                      </span>
                    </Button>
                  </label>
                  <input
                    id="cert-upload"
                    type="file"
                    accept=".pfx,.p12"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setCertFile(file)
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-password">Contraseña del certificado</Label>
                <Input
                  id="cert-password"
                  type="password"
                  placeholder="Introduce la contraseña"
                  value={certPassword}
                  onChange={e => setCertPassword(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-muted/30 p-3 text-sm">
                <p className="font-medium">Modelo: {firmaModal.modelo} {firmaModal.ejercicio} {firmaModal.periodo}</p>
                <p className="text-muted-foreground">
                  Importe: {formatEuro(firmaModal.importe)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleFirmar}
                  disabled={!certFile || !certPassword || firmando}
                  className="flex-1"
                >
                  {firmando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSignature className="mr-2 h-4 w-4" />
                  )}
                  {firmando ? 'Firmando...' : 'Firmar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setFirmaModal(null); setCertFile(null); setCertPassword(''); setCertInfo(null) }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
