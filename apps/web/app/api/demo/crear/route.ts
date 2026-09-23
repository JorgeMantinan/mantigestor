import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitByIp } from '@/lib/rate-limit-ip'
import {
  DEMO_PERFIL_ID,
  DEMO_USER_ID,
  DEMO_PERFIL,
  DEMO_FACTURAS_EMITIDAS,
  DEMO_FACTURAS_RECIBIDAS,
  DEMO_PROPIEDADES,
  DEMO_NOMINAS,
} from '@/lib/demo-data'

export async function POST(req: NextRequest) {
  try {
    const { success } = await rateLimitByIp(req, { maxRequests: 10, windowMs: 60 * 1000 })
    if (!success) {
      return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 })
    }

    const supabase = createAdminClient()

    const inserts: PromiseLike<{ error: Error | null }>[] = []

    await supabase.from('facturas').delete().eq('perfilId', DEMO_PERFIL_ID)
    await supabase.from('propiedades_alquiler').delete().eq('perfilId', DEMO_PERFIL_ID)
    await supabase.from('nominas').delete().eq('perfilId', DEMO_PERFIL_ID)

    const { error: perfilError } = await supabase
      .from('perfiles')
      .delete()
      .in('id', [DEMO_PERFIL_ID])
    if (perfilError) {
      console.error('Error limpiando perfil demo:', perfilError)
    }

    const now = new Date().toISOString()

    const { error: perfilInsertError } = await supabase.from('perfiles').insert({
      id: DEMO_PERFIL_ID,
      userId: DEMO_USER_ID,
      email: DEMO_PERFIL.email,
      nombre: DEMO_PERFIL.nombre,
      nif: DEMO_PERFIL.nif,
      perfilFiscal: 'autonomo',
      createdAt: now,
      updatedAt: now,
    })

    if (perfilInsertError) {
      console.error('Error creando perfil demo:', perfilInsertError)
      return NextResponse.json({ error: 'No se pudo crear el perfil de demostración' }, { status: 500 })
    }

    for (const f of [...DEMO_FACTURAS_EMITIDAS, ...DEMO_FACTURAS_RECIBIDAS]) {
      const importeIva = Math.round(f.baseImponible * (f.iva / 100))
      const total = f.baseImponible + importeIva
      inserts.push(
        supabase.from('facturas').insert({
          id: crypto.randomUUID(),
          perfilId: DEMO_PERFIL_ID,
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

    for (const p of DEMO_PROPIEDADES) {
      inserts.push(
        supabase.from('propiedades_alquiler').insert({
          id: crypto.randomUUID(),
          perfilId: DEMO_PERFIL_ID,
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

    for (const n of DEMO_NOMINAS) {
      const bruto = n.salarioBruto
      const retencion = Math.round(bruto * (n.irpf / 100))
      const neto = bruto - retencion - n.seguridadSocial
      inserts.push(
        supabase.from('nominas').insert({
          id: crypto.randomUUID(),
          perfilId: DEMO_PERFIL_ID,
          empleada: n.empleada,
          mes: n.mes,
          anyo: n.anyo,
          salarioBruto: bruto,
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

    return NextResponse.json({ perfilId: DEMO_PERFIL_ID, usuario: DEMO_PERFIL.nombre })
  } catch (error) {
    console.error('Error en /api/demo/crear:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}