'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/language-context'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitado = searchParams.get('invitado') === 'true'
  const emailInvitado = searchParams.get('email') ?? ''
  const invitacionId = searchParams.get('invitacion') ?? ''
  const { t } = useLanguage()

  const getSupabase = useCallback(() => createClient(), [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)

    if (password.length < 8) {
      setError(t('register.errorLongitud'))
      setCargando(false)
      return
    }

    if (password !== confirmPassword) {
      setError(t('register.errorCoincidencia'))
      setCargando(false)
      return
    }

    const emailFinal = email || emailInvitado
    if (!emailFinal) {
      setError(t('register.errorEmail'))
      setCargando(false)
      return
    }

    const { data, error: authError } = await getSupabase().auth.signUp({
      email: emailFinal,
      password,
      options: {
        data: { nombre },
      },
    })

    if (authError) {
      setError(authError.message)
      setCargando(false)
      return
    }

    if (data.session) {
      const nuevoUserId = data.session.user.id

      // Buscar si hay una invitación pendiente para este email
      let invitacionPendiente: { id: string; invitadoPorUserId: string } | null = null

      if (invitacionId) {
        // Buscar por ID de invitación
        const { data: inv } = await getSupabase()
          .from('invitaciones_pendientes')
          .select('id, invitadoPorUserId')
          .eq('id', invitacionId)
          .eq('email', emailFinal)
          .eq('aceptada', false)
          .maybeSingle()
        invitacionPendiente = inv
      }

      if (!invitacionPendiente && emailFinal) {
        // Buscar por email
        const { data: inv } = await getSupabase()
          .from('invitaciones_pendientes')
          .select('id, invitadoPorUserId')
          .eq('email', emailFinal)
          .eq('aceptada', false)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle()
        invitacionPendiente = inv
      }

      if (invitacionPendiente) {
        // Crear perfil para el usuario invitado — id = auth user id (RLS lo requiere)
        const now = new Date().toISOString()
        const { error: perfilError } = await getSupabase()
          .from('perfiles')
          .insert({
            id: nuevoUserId,
            userId: nuevoUserId,
            email: emailFinal,
            nombre: nombre || null,
            createdAt: now,
            updatedAt: now,
          })

        if (perfilError) {
          console.error('Error creating perfil:', perfilError)
        }

        // Crear asociación propietario → perfil
        await getSupabase()
          .from('perfil_asociado')
          .insert({
            id: crypto.randomUUID(),
            ownerUserId: nuevoUserId,
            perfilId: nuevoUserId,
            rol: 'propietario',
          })

        // Crear asociación gestor → perfil (quien invitó).
        // RPC SECURITY DEFINER: RLS exige auth.uid = ownerUserId, imposible
        // desde el cliente del usuario invitado.
        const { error: gestorError } = await getSupabase().rpc('crear_asociacion_segura', {
          p_owner_user_id: invitacionPendiente.invitadoPorUserId,
          p_perfil_id: nuevoUserId,
          p_rol: 'gestor',
        })
        if (gestorError) {
          console.error('Error creating gestor association:', gestorError)
        }

        // Marcar invitación como aceptada
        await getSupabase()
          .from('invitaciones_pendientes')
          .update({ aceptada: true })
          .eq('id', invitacionPendiente.id)
      } else {
        // Perfil normal (sin invitación)
        const now = new Date().toISOString()
        const { error: perfilError } = await getSupabase()
          .from('perfiles')
          .insert({
            id: nuevoUserId,
            userId: nuevoUserId,
            email: emailFinal,
            nombre,
            createdAt: now,
            updatedAt: now,
          })

        if (perfilError) {
          console.error('Error creating perfil:', perfilError)
        }

        // Crear asociación propietario
        await getSupabase()
          .from('perfil_asociado')
          .insert({
            id: crypto.randomUUID(),
            ownerUserId: nuevoUserId,
            perfilId: nuevoUserId,
            rol: 'propietario',
          })
      }

      router.push('/dashboard')
    } else {
      setError(t('register.revisaCorreo'))
      setCargando(false)
    }
  }

  const handleOAuthRegister = async (provider: 'google' | 'azure') => {
    setCargando(true)
    setError(null)

    try {
      const { error: authError, data } = await getSupabase().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        console.error('OAuth error:', authError)
        setError(authError.message)
        setCargando(false)
        return
      }

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('OAuth exception:', err)
      const msg = err instanceof Error ? err.message : t('register.errorProveedor')
      setError(msg)
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link
            href="/"
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {t('register.volver')}
          </Link>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl font-bold text-primary-foreground">M</span>
          </div>
          <CardTitle className="text-2xl">{t('register.titulo')}</CardTitle>
          <CardDescription>
            {invitado
              ? t('register.subtituloInvitado')
              : t('register.subtitulo')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthRegister('google')}
              disabled={cargando}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t('register.registrarGoogle')}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthRegister('azure')}
              disabled={cargando}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#F25022" d="M11.4 11.4H2V2h9.4v9.4z" />
                <path fill="#00A4EF" d="M22 11.4h-9.4V2H22v9.4z" />
                <path fill="#7FBA00" d="M11.4 22H2v-9.4h9.4V22z" />
                <path fill="#FFB900" d="M22 22h-9.4v-9.4H22V22z" />
              </svg>
              {t('register.registrarOutlook')}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t('register.oConEmail')}
              </span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">{t('register.nombre')}</Label>
              <Input
                id="nombre"
                type="text"
                placeholder={t('register.placeholderNombre')}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('register.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email || emailInvitado}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={invitado}
                required
              />
              {invitado && (
                <p className="text-xs text-muted-foreground">
                  {t('register.emailInvitado')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('register.contrasena')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('register.placeholderContrasena')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('register.confirmarContrasena')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('register.placeholderConfirmar')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={cargando}>
              {cargando ? t('register.creandoCuenta') : t('register.registrar')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {t('register.yaTieneCuenta')}{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('register.iniciarSesion')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
