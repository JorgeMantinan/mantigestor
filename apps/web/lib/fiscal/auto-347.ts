import { createClient } from '@/lib/supabase/client'
import { calcularModelo347, type OperacionTercero } from '@mantigestor/utils'

interface Factura {
  id: string
  tipo: string
  baseImponible: number
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
}

export interface Resultado347Automatico {
  operaciones: OperacionTercero[]
  totalCompras: number
  totalVentas: number
  numTerceros: number
  obligatorio: boolean
}

export async function generar347Automatico(
  perfilId: string,
  anyo: number
): Promise<Resultado347Automatico | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('userId')
    .eq('id', perfilId)
    .single()

  if (perfilError || !perfil || perfil.userId !== user.id) return null

  const desde = `${anyo}-01-01`
  const hasta = `${anyo + 1}-01-01`

  const { data: facturas, error: facturasError } = await supabase
    .from('facturas')
    .select('tipo, baseImponible, emisorReceptor, nifContraparte, fechaEmision')
    .eq('perfilId', perfilId)
    .gte('fechaEmision', desde)
    .lt('fechaEmision', hasta)

  if (facturasError) {
    console.error('Error fetching facturas for modelo 347:', facturasError)
    return null
  }

  if (!facturas || facturas.length === 0) return null

  const typedFacturas = facturas as unknown as Factura[]

  const porTercero = new Map<string, { compras: number; ventas: number; nif: string }>()
  for (const f of typedFacturas) {
    const key = f.emisorReceptor
    const existing = porTercero.get(key) ?? { compras: 0, ventas: 0, nif: f.nifContraparte ?? '' }
    if (f.tipo === 'gasto') {
      existing.compras += f.baseImponible
    } else if (f.tipo === 'ingreso') {
      existing.ventas += f.baseImponible
    }
    if (f.nifContraparte && !existing.nif) existing.nif = f.nifContraparte
    porTercero.set(key, existing)
  }

  const operaciones: OperacionTercero[] = []
  for (const [tercero, datos] of porTercero) {
    const importeTotal = datos.compras + datos.ventas
    if (importeTotal <= 0) continue
    operaciones.push({
      tercero,
      nif: datos.nif,
      importeTotal,
      importeCompra: datos.compras,
      importeVenta: datos.ventas,
      operacionInmueble: false,
      operacionSeguros: false,
      cantidadesPendientes: 0,
    })
  }

  if (operaciones.length === 0) return null

  const resultado = calcularModelo347({ operaciones })

  return {
    operaciones,
    totalCompras: resultado.totalCompras,
    totalVentas: resultado.totalVentas,
    numTerceros: resultado.numTerceros,
    obligatorio: resultado.obligatorio,
  }
}
