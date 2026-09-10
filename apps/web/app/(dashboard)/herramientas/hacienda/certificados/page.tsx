'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  KeyRound,
  Upload,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Clock,
  Shield,
  FileText,
} from 'lucide-react'
import { leerCertificado, esCertificadoValido, type CertificadoInfo } from '@/lib/hacienda-firma'

interface CertificadoAlmacenado {
  id: string
  info: CertificadoInfo
  subidoEn: string
  activo: boolean
}

export default function CertificadosPage() {
  const [certificados, setCertificados] = useState<CertificadoAlmacenado[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')

  const handleSubirCertificado = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!password.trim()) {
      setError('Introduce la contraseña del certificado')
      return
    }

    setSubiendo(true)
    setError(null)

    try {
      const info = await leerCertificado(file, password)

      if (!esCertificadoValido(info)) {
        setError('El certificado está caducado')
        setSubiendo(false)
        return
      }

      const duplicado = certificados.some(c => c.info.numeroSerie === info.numeroSerie)
      if (duplicado) {
        setError('Este certificado ya está registrado')
        setSubiendo(false)
        return
      }

      const nuevo: CertificadoAlmacenado = {
        id: crypto.randomUUID(),
        info,
        subidoEn: new Date().toISOString(),
        activo: certificados.length === 0,
      }

      setCertificados(prev => [...prev, nuevo])
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al leer el certificado')
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }, [password, certificados])

  const handleEliminar = useCallback((id: string) => {
    setCertificados(prev => prev.filter(c => c.id !== id))
  }, [])

  const handleActivar = useCallback((id: string) => {
    setCertificados(prev => prev.map(c => ({ ...c, activo: c.id === id })))
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6" />
          Certificados Digitales
        </h1>
        <p className="text-muted-foreground">
          Gestiona tus certificados digitales para firmar y presentar declaraciones ante Hacienda
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:bg-red-950 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setError(null)}>
            Cerrar
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir certificado
          </CardTitle>
          <CardDescription>
            Formatos soportados: PKCS#12 (.pfx o .p12)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cert-password">Contraseña del certificado</Label>
            <Input
              id="cert-password"
              type="password"
              placeholder="Introduce la contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cert-file-input">
              <Button variant="outline" className="w-full" asChild disabled={subiendo || !password.trim()}>
                <span>
                  {subiendo ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Leyendo certificado...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Seleccionar archivo .pfx / .p12
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="cert-file-input"
              type="file"
              accept=".pfx,.p12"
              className="hidden"
              onChange={handleSubirCertificado}
              disabled={subiendo || !password.trim()}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tu certificado NO se almacena en el servidor. Solo se guarda información básica (alias, emisor, fecha de caducidad).
          </p>
        </CardContent>
      </Card>

      {certificados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Certificados registrados</h2>
          {certificados.map(cert => {
            const valido = esCertificadoValido(cert.info)
            return (
              <Card key={cert.id} className={cert.activo ? 'border-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span className="font-medium">{cert.info.alias}</span>
                        {cert.activo && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Activo
                          </Badge>
                        )}
                        {!valido && (
                          <Badge variant="destructive">Caducado</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>Emisor: {cert.info.emisor}</p>
                        <p>Sujeto: {cert.info.sujeto}</p>
                        <p>
                          Válido: {new Date(cert.info.fechaInicio).toLocaleDateString('es-ES')} — {new Date(cert.info.fechaFin).toLocaleDateString('es-ES')}
                        </p>
                        <p className="text-xs">Serie: {cert.info.numeroSerie}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!cert.activo && valido && (
                        <Button variant="outline" size="sm" onClick={() => handleActivar(cert.id)}>
                          Activar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminar(cert.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {certificados.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <KeyRound className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay certificados</p>
            <p className="text-muted-foreground text-sm">
              Sube un certificado digital PKCS#12 para poder firmar declaraciones
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
