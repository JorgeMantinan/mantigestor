'use client'

import { createClient } from '@/lib/supabase/client'

interface BackupData {
  version: string
  exportedAt: string
  perfilId: string
  facturas: unknown[]
  documentos: unknown[]
  suscripciones: unknown[]
  notificaciones: unknown[]
}

export async function generarBackupUsuario(perfilId: string): Promise<Blob> {
  const supabase = createClient()

  const [facturasRes, documentosRes, suscripcionesRes, notificacionesRes] = await Promise.all([
    supabase.from('facturas').select('*').eq('perfilId', perfilId).order('fechaEmision', { ascending: true }),
    supabase.from('documentos').select('*').eq('perfilId', perfilId),
    supabase.from('suscripciones').select('*').eq('perfilId', perfilId),
    supabase.from('notificaciones').select('*').eq('perfilId', perfilId).order('creadoEn', { ascending: false }),
  ])

  const backup: BackupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    perfilId,
    facturas: facturasRes.data ?? [],
    documentos: documentosRes.data ?? [],
    suscripciones: suscripcionesRes.data ?? [],
    notificaciones: notificacionesRes.data ?? [],
  }

  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
}

export async function subirBackupSupabase(
  perfilId: string,
  blob: Blob,
): Promise<string | null> {
  const supabase = createClient()
  const fecha = new Date().toISOString().slice(0, 10)
  const path = `backups/${perfilId}/backup-${fecha}.json`

  const { error } = await supabase.storage
    .from('backups')
    .upload(path, blob, {
      contentType: 'application/json',
      upsert: true,
    })

  if (error) {
    console.error('Error subiendo backup:', error.message)
    return null
  }

  const { data: urlData } = supabase.storage.from('backups').getPublicUrl(path)
  return urlData?.publicUrl ?? null
}

export async function enviarEmailBackup(
  email: string,
  nombre: string | null,
  downloadUrl: string,
): Promise<void> {
  const res = await fetch('/api/email/enviar-backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, nombre, downloadUrl }),
  })

  if (!res.ok) {
    console.error('Error enviando email de backup:', await res.text())
  }
}
