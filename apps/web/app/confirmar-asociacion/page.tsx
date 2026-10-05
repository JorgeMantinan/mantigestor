'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function ConfirmarAsociacionPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ConfirmarAsociacion />
    </Suspense>
  )
}

function ConfirmarAsociacion() {
  const searchParams = useSearchParams()
  const _router = useRouter()
  const invitacionId = searchParams.get('invitacion')
  const email = searchParams.get('email')

  const [estado, setEstado] = useState<'cargando' | 'confirmar' | 'exito' | 'error' | 'no-logueado'>('cargando')
  const [mensaje, setMensaje] = useState('')
  const [invitadorEmail, setInvitadorEmail] = useState('')
  const [invitadorNombre, setInvitadorNombre] = useState('')

  const getSupabase = useCallback(() => createClient(), [])

  useEffect(() => {
    if (!invitacionId || !email) {
      setEstado('error')
      setMensaje('Enlace de invitación inválido.')
      return
    }

    const ctrl = new AbortController()
    const fetchData = async () => {
      // Primero obtener info del invitador (sin auth)
      try {
        const resInfo = await fetch(`/api/fiscal/confirmar-asociacion?invitacion=${invitacionId}&email=${encodeURIComponent(email)}`, { signal: ctrl.signal })
        const infoData = await resInfo.json()

        if (infoData.aceptada) {
          setEstado('error')
          setMensaje('Esta invitación ya fue aceptada anteriormente.')
          return
        }

        if (infoData.invitadorNombre) setInvitadorNombre(infoData.invitadorNombre)
        if (infoData.invitadorEmail) setInvitadorEmail(infoData.invitadorEmail)
      } catch {
        // Silencioso — mostraremos "Un gestor" si no carga
      }

      // Luego verificar auth
      const { data: { user } } = await getSupabase().auth.getUser()

      if (!user) {
        setEstado('no-logueado')
        return
      }

      if (user.email !== email) {
        setEstado('error')
        setMensaje(`Esta invitación es para ${email}, pero estás logueado como ${user.email}. Cierra sesión y vuelve a abrir el enlace.`)
        return
      }

      setEstado('confirmar')
    }

    fetchData()
    return () => ctrl.abort()
  }, [invitacionId, email, getSupabase])

  const handleConfirmar = async () => {
    setEstado('cargando')
    try {
      const res = await fetch('/api/fiscal/confirmar-asociacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitacionId, email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setEstado('error')
        setMensaje(data.error || 'Error al confirmar la asociación.')
        return
      }

      setInvitadorEmail(data.invitadorEmail || '')
      setInvitadorNombre(data.invitadorNombre || '')
      setEstado('exito')
    } catch {
      setEstado('error')
      setMensaje('Error de red al confirmar.')
    }
  }

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (estado === 'no-logueado') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <LogIn className="mx-auto mb-4 h-12 w-12 text-primary" />
            <CardTitle>Inicia sesión para confirmar</CardTitle>
            <CardDescription>
              Necesitas estar logueado como <strong>{email}</strong> para aceptar esta asociación.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link href={`/login?next=/confirmar-asociacion?invitacion=${invitacionId}&email=${encodeURIComponent(email ?? '')}`} className="w-full">
              <Button className="w-full">Iniciar sesión</Button>
            </Link>
            <Link href={`/register?invitacion=${invitacionId}&email=${encodeURIComponent(email ?? '')}`} className="w-full">
              <Button variant="outline" className="w-full">Crear cuenta nueva</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <CardTitle>Error</CardTitle>
            <CardDescription>{mensaje}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/dashboard" className="w-full">
              <Button variant="outline" className="w-full">Ir al dashboard</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (estado === 'exito') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <CardTitle>¡Asociación confirmada!</CardTitle>
            <CardDescription>
              {invitadorEmail && <>Ahora <strong>{invitadorEmail}</strong> puede gestionar tus datos fiscales.</>}
              {!invitadorEmail && <>La asociación se ha completado correctamente.</>}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">Ir al dashboard</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Confirmar asociación</CardTitle>
          <CardDescription>
            {invitadorNombre
              ? <><strong>{invitadorNombre}</strong> ({invitadorEmail})</>
              : <strong>{invitadorEmail || 'Un gestor'}</strong>
            } quiere asociarse a tu cuenta para gestionar tus datos fiscales.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Al confirmar, esta persona podrá ver y gestionar tus facturas, trimestres y otros documentos fiscales en tu nombre.
          </p>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Link href="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">Rechazar</Button>
          </Link>
          <Button onClick={handleConfirmar} className="flex-1">Confirmar</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
