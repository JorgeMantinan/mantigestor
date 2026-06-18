'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import { FileUpload } from '@/components/upload/FileUpload'
import Link from 'next/link'

const TIPOS_IVA = [21, 10, 4, 0] as const

export default function NuevaFacturaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [getSupabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const baseImponible = parseFloat(form.get('baseImponible') as string) * 100
    const iva = parseInt(form.get('iva') as string, 10)
    const importeIva = Math.round(baseImponible * (iva / 100))
    const total = baseImponible + importeIva

    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) {
      setError('No has iniciado sesión')
      setLoading(false)
      return
    }

    const { error: insertError } = await getSupabase().from('facturas').insert({
      perfilId: user.id,
      numero: form.get('numero') as string,
      tipo: form.get('tipo') as string,
      emisorReceptor: form.get('emisorReceptor') as string,
      nifContraparte: form.get('nifContraparte') as string,
      fechaEmision: form.get('fechaEmision') as string,
      fechaVencimiento: form.get('fechaVencimiento') as string || null,
      baseImponible,
      iva,
      total,
      estado: 'pendiente',
      pdfUrl: pdfUrl || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/gestoria/facturas')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/gestoria/facturas">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Nueva factura</h1>
          <p className="text-muted-foreground">Introduce los datos de la factura</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la factura</CardTitle>
          <CardDescription>Rellena todos los campos obligatorios</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <select
                  id="tipo"
                  name="tipo"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="ingreso">Ingreso (emitida)</option>
                  <option value="gasto">Gasto (recibida)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Nº factura</Label>
                <Input id="numero" name="numero" required placeholder="F-2024-001" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emisorReceptor">Nombre/cliente o proveedor</Label>
                <Input id="emisorReceptor" name="emisorReceptor" required placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nifContraparte">NIF/CIF</Label>
                <Input id="nifContraparte" name="nifContraparte" placeholder="12345678Z" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaEmision">Fecha de emisión</Label>
                <Input id="fechaEmision" name="fechaEmision" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
                <Input id="fechaVencimiento" name="fechaVencimiento" type="date" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="baseImponible">Base imponible (€)</Label>
                <Input id="baseImponible" name="baseImponible" type="number" step="0.01" required placeholder="100.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iva">IVA (%)</Label>
                <select
                  id="iva"
                  name="iva"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {TIPOS_IVA.map((t) => (
                    <option key={t} value={t}>
                      {t}%
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="importeTotal">Total (€)</Label>
                <Input id="importeTotal" disabled placeholder="Se calcula automáticamente" />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/dashboard/gestoria/facturas" className="flex-1">
                <Button variant="outline" type="button" className="w-full">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Guardando...' : 'Crear factura'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documento adjunto</CardTitle>
          <CardDescription>Sube el PDF de la factura (opcional)</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            bucket="documentos"
            path={userId ?? ''}
            tipo="factura"
            accept=".pdf"
            buttonText="Subir factura PDF"
            onUploadComplete={(url) => setPdfUrl(url)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
