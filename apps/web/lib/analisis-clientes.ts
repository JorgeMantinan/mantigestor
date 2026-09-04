interface FacturaCliente {
  tipo: string
  emisorReceptor: string
  total: number
  fechaEmision: string
  fechaVencimiento: string | null
  estado: string
}

interface ClienteStats {
  nombre: string
  totalFacturado: number
  numFacturas: number
  diasMedioPago: number | null
}

interface ResultadoAnalisis {
  topClientes: ClienteStats[]
  retencion: number
  concentracion: number
  totalClientes: number
}

export function analizarClientes(facturas: FacturaCliente[]): ResultadoAnalisis {
  const emitidas = facturas.filter(f => f.tipo === 'ingreso')

  if (emitidas.length === 0) {
    return { topClientes: [], retencion: 0, concentracion: 0, totalClientes: 0 }
  }

  const porCliente = new Map<string, { total: number; count: number; pagadas: number; diasPago: number[] }>()

  for (const f of emitidas) {
    const key = f.emisorReceptor || 'Desconocido'
    const entry = porCliente.get(key) ?? { total: 0, count: 0, pagadas: 0, diasPago: [] }
    entry.total += f.total
    entry.count += 1

    if (f.estado === 'pagada' && f.fechaVencimiento) {
      entry.pagadas += 1
      const emision = new Date(f.fechaEmision)
      const vencimiento = new Date(f.fechaVencimiento)
      const diff = Math.max(0, Math.round((vencimiento.getTime() - emision.getTime()) / (1000 * 60 * 60 * 24)))
      entry.diasPago.push(diff)
    }

    porCliente.set(key, entry)
  }

  const totalFacturado = emitidas.reduce((s, f) => s + f.total, 0)

  const clientes: ClienteStats[] = Array.from(porCliente.entries()).map(([nombre, data]) => ({
    nombre,
    totalFacturado: data.total,
    numFacturas: data.count,
    diasMedioPago: data.diasPago.length > 0
      ? Math.round(data.diasPago.reduce((a, b) => a + b, 0) / data.diasPago.length)
      : null,
  }))

  clientes.sort((a, b) => b.totalFacturado - a.totalFacturado)

  const top10 = clientes.slice(0, 10)

  const clientesUnicos = new Set(emitidas.map(f => f.emisorReceptor))
  const clientesConMultiples = new Set(
    emitidas.reduce<{ cliente: string; count: number }[]>((acc, f) => {
      const existing = acc.find(e => e.cliente === f.emisorReceptor)
      if (existing) existing.count += 1
      else acc.push({ cliente: f.emisorReceptor, count: 1 })
      return acc
    }, []).filter(e => e.count > 1).map(e => e.cliente)
  )
  const retencion = clientesUnicos.size > 0
    ? Math.round((clientesConMultiples.size / clientesUnicos.size) * 100)
    : 0

  const top3Total = clientes.slice(0, 3).reduce((s, c) => s + c.totalFacturado, 0)
  const concentracion = totalFacturado > 0
    ? Math.round((top3Total / totalFacturado) * 100)
    : 0

  return {
    topClientes: top10,
    retencion,
    concentracion,
    totalClientes: clientesUnicos.size,
  }
}
