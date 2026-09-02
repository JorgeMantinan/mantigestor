export interface Anomalia {
  tipo: 'gasto_alto' | 'gasto_bajo' | 'nueva_categoria' | 'gasto_duplicado' | 'tendencia_alza'
  titulo: string
  descripcion: string
  severidad: 'alta' | 'media' | 'baja'
  fechaDetectada: string
}

interface FacturaInput {
  id: string
  tipo: string
  total: number
  emisorReceptor: string
  fechaEmision: string
  categoriaGasto: string | null
}

const SEVERIDAD_ORDEN: Record<string, number> = { alta: 0, media: 1, baja: 2 }

function agruparPorMes(facturas: FacturaInput[]): Map<string, { gastos: number; categorias: Set<string> }> {
  const mapa = new Map<string, { gastos: number; categorias: Set<string> }>()
  for (const f of facturas) {
    if (f.tipo !== 'gasto') continue
    const mes = f.fechaEmision.slice(0, 7)
    let entry = mapa.get(mes)
    if (!entry) {
      entry = { gastos: 0, categorias: new Set() }
      mapa.set(mes, entry)
    }
    entry.gastos += f.total
    if (f.categoriaGasto) entry.categorias.add(f.categoriaGasto)
  }
  return mapa
}

function detectarGastoInusual(facturas: FacturaInput[], meses: string[]): Anomalia[] {
  const anomalias: Anomalia[] = []
  const porMes = agruparPorMes(facturas)
  const mesActual = meses[0]!
  const gastoActual = porMes.get(mesActual)?.gastos ?? 0
  const mesesPrevios = meses.slice(1, 4)
  const gastosPrevios = mesesPrevios.map(m => porMes.get(m)?.gastos ?? 0).filter(g => g > 0)

  if (gastosPrevios.length === 0) return anomalias

  const promedio = gastosPrevios.reduce((a, b) => a + b, 0) / gastosPrevios.length

  if (gastoActual > promedio * 2 && promedio > 0) {
    const ratio = Math.round((gastoActual / promedio) * 100)
    anomalias.push({
      tipo: 'gasto_alto',
      titulo: 'Gasto inusualmente alto',
      descripcion: `El gasto de ${mesActual} es un ${ratio}% superior a la media de los 3 meses anteriores.`,
      severidad: ratio > 300 ? 'alta' : 'media',
      fechaDetectada: new Date().toISOString(),
    })
  }

  if (gastoActual < promedio * 0.5 && gastoActual > 0 && promedio > 0) {
    const ratio = Math.round((gastoActual / promedio) * 100)
    anomalias.push({
      tipo: 'gasto_bajo',
      titulo: 'Gasto inusualmente bajo',
      descripcion: `El gasto de ${mesActual} es solo un ${ratio}% de la media de los 3 meses anteriores.`,
      severidad: 'baja',
      fechaDetectada: new Date().toISOString(),
    })
  }

  return anomalias
}

function detectarNuevaCategoria(facturas: FacturaInput[], meses: string[]): Anomalia[] {
  const anomalias: Anomalia[] = []
  const porMes = agruparPorMes(facturas)
  const mesActual = meses[0]!
  const catsActuales = porMes.get(mesActual)?.categorias ?? new Set()
  const mesesPrevios = meses.slice(1, 4)
  const catsPrevias = new Set<string>()
  for (const m of mesesPrevios) {
    const cats = porMes.get(m)?.categorias
    if (cats) cats.forEach(c => catsPrevias.add(c))
  }

  for (const cat of catsActuales) {
    if (!catsPrevias.has(cat)) {
      anomalias.push({
        tipo: 'nueva_categoria',
        titulo: `Nueva categoría: ${cat}`,
        descripcion: `La categoría "${cat}" aparece por primera vez en los últimos 3 meses.`,
        severidad: 'baja',
        fechaDetectada: new Date().toISOString(),
      })
    }
  }

  return anomalias
}

function detectarGastoDuplicado(facturas: FacturaInput[]): Anomalia[] {
  const anomalias: Anomalia[] = []
  const gastos = facturas.filter(f => f.tipo === 'gasto')
  const porProveedor = new Map<string, FacturaInput[]>()

  for (const f of gastos) {
    const key = f.emisorReceptor.toLowerCase().trim()
    const arr = porProveedor.get(key) ?? []
    arr.push(f)
    porProveedor.set(key, arr)
  }

  const duplicados = new Set<string>()

  for (const [, facturasProveedor] of porProveedor) {
    for (let i = 0; i < facturasProveedor.length; i++) {
      for (let j = i + 1; j < facturasProveedor.length; j++) {
        const a = facturasProveedor[i]!
        const b = facturasProveedor[j]!
        const diffDias = Math.abs(
          (new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (a.total === b.total && diffDias <= 7) {
          const key = [a.id, b.id].sort().join('-')
          if (!duplicados.has(key)) {
            duplicados.add(key)
            const formatoEuro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
            anomalias.push({
              tipo: 'gasto_duplicado',
              titulo: 'Posible gasto duplicado',
              descripcion: `${a.emisorReceptor}: ${formatoEuro.format(a.total / 100)} el ${new Date(a.fechaEmision).toLocaleDateString('es-ES')} y ${new Date(b.fechaEmision).toLocaleDateString('es-ES')}.`,
              severidad: 'media',
              fechaDetectada: new Date().toISOString(),
            })
          }
        }
      }
    }
  }

  return anomalias
}

function detectarTendenciaAlza(facturas: FacturaInput[], meses: string[]): Anomalia[] {
  const anomalias: Anomalia[] = []
  const porMes = agruparPorMes(facturas)
  const ultimosCuatro = meses.slice(0, 4)
  const gastosMeses: number[] = ultimosCuatro.map(m => porMes.get(m)?.gastos ?? 0)

  if (gastosMeses.filter(g => g > 0).length < 3) return anomalias

  let creciente = 0
  for (let i = 0; i < gastosMeses.length - 1; i++) {
    const actual = gastosMeses[i] ?? 0
    const siguiente = gastosMeses[i + 1] ?? 0
    if (actual > siguiente && siguiente > 0) creciente++
  }

  if (creciente >= 3) {
    const formatoEuro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
    const ultimoMes = gastosMeses[0] ?? 0
    const primerMes = gastosMeses[3] ?? 0
    anomalias.push({
      tipo: 'tendencia_alza',
      titulo: 'Tendencia creciente de gastos',
      descripcion: `Los gastos han aumentado durante ${creciente} meses consecutivos. Último mes: ${formatoEuro.format(ultimoMes / 100)}.`,
      severidad: ultimoMes > primerMes * 1.5 ? 'alta' : 'media',
      fechaDetectada: new Date().toISOString(),
    })
  }

  return anomalias
}

function obtenerMeses(facturas: FacturaInput[]): string[] {
  const meses = new Set<string>()
  for (const f of facturas) {
    meses.add(f.fechaEmision.slice(0, 7))
  }
  return Array.from(meses).sort().reverse()
}

export function detectarAnomalias(facturas: FacturaInput[]): Anomalia[] {
  const meses = obtenerMeses(facturas)
  if (meses.length < 2) return []

  const anomalias = [
    ...detectarGastoInusual(facturas, meses),
    ...detectarNuevaCategoria(facturas, meses),
    ...detectarGastoDuplicado(facturas),
    ...detectarTendenciaAlza(facturas, meses),
  ]

  return anomalias.sort((a, b) =>
    (SEVERIDAD_ORDEN[a.severidad] ?? 2) - (SEVERIDAD_ORDEN[b.severidad] ?? 2)
  )
}
