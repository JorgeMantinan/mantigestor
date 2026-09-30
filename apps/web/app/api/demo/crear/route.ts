import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/demo-data'
import { obtenerCasoDemo } from '@/lib/demo/casos'
import { regenerarModelosPeriodo } from '@/lib/fiscal/modelos-generados'
import type { Trimestre } from '@/lib/fiscal/generador-modelos'

const TABLAS_CON_PERFIL = [
  'facturas',
  'nominas',
  'propiedades_alquiler',
  'gastos_alquiler',
  'modelos_generados',
  'notificaciones',
  'documentos',
  'proformas',
]

async function limpiarDatosDemo(supabase: SupabaseClient, perfilId: string): Promise<void> {
  for (const tabla of TABLAS_CON_PERFIL) {
    // perfiles demo antiguos (clave fija demo-*) y los datos de la sesión actual
    await supabase.from(tabla).delete().like('perfilId', 'demo-%')
    await supabase.from(tabla).delete().eq('perfilId', perfilId)
  }
  await supabase.from('perfiles').delete().like('id', 'demo-%')
  await supabase.from('perfiles').delete().eq('id', perfilId)
}

/** Devuelve el uid del usuario demo de Supabase Auth (creándolo o restableciendo su contraseña) */
async function obtenerUsuarioDemo(supabase: SupabaseClient): Promise<string> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw new Error(error.message)
    const existente = data.users.find(u => u.email?.toLowerCase() === DEMO_EMAIL)
    if (existente) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existente.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      })
      if (updateError) throw new Error(updateError.message)
      return existente.id
    }
    if (data.users.length < 100) break
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(error?.message ?? 'No se pudo crear el usuario demo')
  return data.user.id
}

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const body = (await req.json().catch(() => ({}))) as { caso?: string }
    let caso = obtenerCasoDemo(body.caso)
    if (body.caso && !caso) {
      return NextResponse.json({ error: 'Caso de demostración no encontrado' }, { status: 400 })
    }
    if (!caso) caso = obtenerCasoDemo('lucia-diseno')
    if (!caso) {
      return NextResponse.json({ error: 'Caso de demostración no encontrado' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const perfilId = await obtenerUsuarioDemo(supabase)
    await limpiarDatosDemo(supabase, perfilId)

    const now = new Date().toISOString()

    const { error: perfilInsertError } = await supabase.from('perfiles').insert({
      id: perfilId,
      userId: perfilId,
      email: DEMO_EMAIL,
      nombre: caso.nombre,
      nif: caso.nif,
      perfilFiscal: caso.perfilFiscal,
      createdAt: now,
      updatedAt: now,
    })

    if (perfilInsertError) {
      console.error('Error creando perfil demo:', perfilInsertError)
      return NextResponse.json({ error: 'No se pudo crear el perfil de demostración' }, { status: 500 })
    }

    const inserts: PromiseLike<{ error: Error | null }>[] = []

    for (const f of caso.facturas) {
      const importeIva = Math.round(f.baseImponible * (f.iva / 100))
      const total = f.baseImponible + importeIva
      inserts.push(
        supabase.from('facturas').insert({
          id: crypto.randomUUID(),
          perfilId,
          numero: f.numero,
          tipo: f.tipo,
          emisorReceptor: f.emisorReceptor,
          nifContraparte: f.nifContraparte,
          fechaEmision: f.fechaEmision,
          fechaVencimiento: f.fechaVencimiento,
          baseImponible: f.baseImponible,
          iva: f.iva,
          total,
          estado: f.estado,
          categoriaGasto: f.categoriaGasto,
          moneda: 'EUR',
          tipoCambio: 1,
          descuentoPorcentaje: 0,
          createdAt: now,
        })
      )
    }

    for (const p of caso.propiedades) {
      inserts.push(
        supabase.from('propiedades_alquiler').insert({
          id: crypto.randomUUID(),
          perfilId,
          direccion: p.direccion,
          ingresos: p.ingresos,
          inquilinoNombre: p.inquilinoNombre,
          inquilinoNif: p.inquilinoNif,
          fechaInicioContrato: p.fechaInicioContrato,
          createdAt: now,
          updatedAt: now,
        })
      )
    }

    for (const n of caso.nominas) {
      const retencion = Math.round(n.salarioBruto * (n.irpf / 100))
      const neto = n.salarioBruto - retencion - n.seguridadSocial
      inserts.push(
        supabase.from('nominas').insert({
          id: crypto.randomUUID(),
          perfilId,
          empleada: n.empleada,
          mes: n.mes,
          anyo: n.anyo,
          salarioBruto: n.salarioBruto,
          irpf: n.irpf,
          seguridadSocial: n.seguridadSocial,
          neto,
          rol: n.rol,
          createdAt: now,
        })
      )
    }

    const results = await Promise.allSettled(inserts)
    const errores = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error))
    if (errores.length > 0) {
      console.error('Errores creando datos demo:', errores.slice(0, 5).map(e => e.status === 'fulfilled' ? e.value.error : e.reason))
    }

    // Genera y almacena los modelos fiscales (303, 111, 130) de los 4 trimestres de 2026
    let modelosGenerados = 0
    for (const trimestre of [1, 2, 3, 4] as Trimestre[]) {
      try {
        const { modelos } = await regenerarModelosPeriodo(supabase, perfilId, 2026, trimestre)
        modelosGenerados += modelos.length
      } catch (e) {
        console.error('Error generando modelos fiscales de la demo:', e)
      }
    }

    return NextResponse.json({
      perfilId,
      usuario: caso.nombre,
      caso: caso.clave,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      modelosGenerados,
    })
  } catch (error) {
    console.error('Error en /api/demo/crear:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
