export type OrigenImportacion = 'quipu' | 'holded' | 'contaplus' | 'generico'
export type TipoImportacion = 'facturas' | 'nominas' | 'propiedades'

export interface FilaFacturaImportable {
  numero: string
  tipo: 'ingreso' | 'gasto'
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  estado: string
  categoriaGasto: string | null
}

export interface FilaNominaImportable {
  empleada: string
  mes: number
  anyo: number
  salarioBruto: number
  irpf: number
  seguridadSocial: number
  neto: number
  rol: string
}

export interface FilaPropiedadImportable {
  direccion: string
  ingresos: number
  inquilinoNombre: string
  inquilinoNif: string | null
}

export interface ResultadoImportacion {
  origen: OrigenImportacion
  facturas: FilaFacturaImportable[]
  errores: string[]
}

export const ORIGENES_IMPORTACION: { id: OrigenImportacion; nombre: string; descripcion: string }[] = [
  { id: 'quipu', nombre: 'Quipu', descripcion: 'CSV con categorías Ventas/Gastos' },
  { id: 'holded', nombre: 'Holded', descripcion: 'Facturas emitidas y recibidas (CSV/Excel)' },
  { id: 'contaplus', nombre: 'ContaPlus / Sage', descripcion: 'CSV con formato SAGE.csv' },
  { id: 'generico', nombre: 'Excel genérico', descripcion: 'Cualquier hoja con columnas reconocibles' },
]

const NORMALIZAR_MAP: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ñ: 'n',
}

export function normalizarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  const texto = String(valor).trim()
  return texto
    .toLowerCase()
    .split('')
    .map(ch => NORMALIZAR_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9.+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buscarColumna(headers: string[], posibles: string[]): string | null {
  for (const header of headers) {
    const h = normalizarTexto(header)
    for (const p of posibles) {
      if (h.includes(p)) return header
    }
  }
  return null
}

function celda(fila: Record<string, unknown>, columna: string | null): unknown {
  return columna === null ? undefined : fila[columna]
}

export function parsearNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') return isFinite(valor) ? valor : null
  let texto = String(valor).trim()
  if (!texto) return null
  texto = texto.replace(/[€$\s.]/g, '').replace(',', '.')
  const limpio = texto.replace(/[^0-9.+-]/g, '')
  const numero = parseFloat(limpio)
  return isNaN(numero) ? null : numero
}

export function parsearFecha(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10)
  }
  const texto = String(valor).trim()
  if (!texto) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10)

  const matchDiaMesAnyo = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (matchDiaMesAnyo) {
    const dia = parseInt(matchDiaMesAnyo[1]!, 10)
    const mes = parseInt(matchDiaMesAnyo[2]!, 10)
    let anyo = parseInt(matchDiaMesAnyo[3]!, 10)
    if (anyo < 100) anyo += 2000
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      return `${anyo}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    }
  }

  const fecha = new Date(texto)
  if (!isNaN(fecha.getTime())) return fecha.toISOString().slice(0, 10)

  return null
}

function normalizarIva(valor: unknown): number {
  if (valor === null || valor === undefined) return 21
  if (typeof valor === 'number') {
    if (valor === 0 || valor === 4 || valor === 10 || valor === 21) return valor
    return 21
  }
  const numero = parseFloat(String(valor).replace('%', '').replace(',', '.'))
  if ([0, 4, 10, 21].includes(numero)) return numero
  return 21
}

function normalizarEstado(valor: unknown): string {
  const texto = normalizarTexto(valor)
  if (texto.includes('pag') || texto.includes('cobrad') || texto.includes('paid') || texto === 'si') return 'pagada'
  if (texto.includes('venc') || texto.includes('overdue')) return 'vencida'
  return 'pendiente'
}

function normalizarCategoria(valor: unknown): string | null {
  const texto = String(valor ?? '').trim()
  if (!texto) return null
  const coincidencias: Record<string, string> = {
    alquiler: 'alquiler',
    suministro: 'suministros',
    luz: 'suministros',
    agua: 'suministros',
    internet: 'suministros',
    telefono: 'suministros',
    telef: 'suministros',
    formacion: 'formacion',
    curso: 'formacion',
    seguro: 'seguros',
    material: 'material',
    oficina: 'suministros',
    nomina: 'nomina',
    marketing: 'marketing',
    publicidad: 'marketing',
  }
  const n = normalizarTexto(valor)
  for (const [clave, categoria] of Object.entries(coincidencias)) {
    if (n.includes(clave)) return categoria
  }
  return 'otros'
}

function filaValida(f: FilaFacturaImportable): boolean {
  return !!(f.emisorReceptor && f.fechaEmision && (f.baseImponible > 0 || f.total > 0))
}

async function leerObjetosDeArchivo(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx')
  const esCSV = /\.(csv|txt)$/i.test(file.name)
  let wb
  if (esCSV) {
    const texto = await file.text()
    wb = XLSX.read(texto, { type: 'string', raw: true })
  } else {
    const datos = await file.arrayBuffer()
    wb = XLSX.read(datos, { type: 'array', raw: true })
  }
  const nombreHoja = wb.SheetNames[0]
  const hoja = nombreHoja ? wb.Sheets[nombreHoja] : undefined
  if (!hoja) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' })
}

function mapearQuipu(headers: string[], filas: Record<string, unknown>[]): FilaFacturaImportable[] {
  const colFecha = buscarColumna(headers, ['fecha', 'date'])
  const colCuenta = buscarColumna(headers, ['cuenta', 'nombre', 'cliente', 'proveedor', 'emisor'])
  const colConcepto = buscarColumna(headers, ['concepto', 'detalle'])
  const colImporte = buscarColumna(headers, ['importe', 'cantidad', 'total'])
  const colCategoria = buscarColumna(headers, ['categoria', 'categor'])
  const colTipo = buscarColumna(headers, ['tipo', 'typo', 'tipo de'])
  const colIva = buscarColumna(headers, ['iva'])
  const colNum = buscarColumna(headers, ['numero', 'num', 'doc'])

  if (!colFecha || (!colImporte && !colConcepto)) return []

  const resultado: FilaFacturaImportable[] = []
  for (const fila of filas) {
    const importe = parsearNumero(celda(fila, colImporte) ?? celda(fila, colConcepto))
    if (importe === null) continue
    const categoria = String(celda(fila, colCategoria) ?? '').trim()
    const tipoTexto = String(celda(fila, colTipo) ?? '').toLowerCase()
    const esIngreso =
      tipoTexto.includes('venta') ||
      tipoTexto.includes('ingreso') ||
      (tipoTexto === '' && importe > 0) ||
      normalizarTexto(categoria).includes('vent')

    const importeAbs = Math.abs(importe)
    const iva = normalizarIva(celda(fila, colIva))
    const total = Math.round(importeAbs * 100)
    const baseImponible = celda(fila, colIva)
      ? Math.round((total / (1 + iva / 100)) / 1)
      : total

    const f: FilaFacturaImportable = {
      numero: colNum ? String(celda(fila, colNum) ?? '').trim() : '',
      tipo: esIngreso ? 'ingreso' : 'gasto',
      emisorReceptor: String(celda(fila, colCuenta) ?? celda(fila, colConcepto) ?? '').trim(),
      nifContraparte: null,
      fechaEmision: parsearFecha(celda(fila, colFecha)) ?? new Date().toISOString().slice(0, 10),
      baseImponible,
      iva,
      total,
      estado: 'pendiente',
      categoriaGasto: esIngreso ? null : normalizarCategoria(celda(fila, colCategoria)),
    }
    if (filaValida(f)) resultado.push(f)
  }
  return resultado
}

function mapearHolded(headers: string[], filas: Record<string, unknown>[]): FilaFacturaImportable[] {
  const colFecha = buscarColumna(headers, ['fecha', 'date'])
  const colNum = buscarColumna(headers, ['numero', 'num', 'doc', 'folio'])
  const colContraparte = buscarColumna(headers, ['cliente', 'proveedor', 'tercero', 'contraparte', 'emisor'])
  const colNif = buscarColumna(headers, ['nif', 'cif', 'dni'])
  const colBase = buscarColumna(headers, ['base', 'base imp'])
  const colIva = buscarColumna(headers, ['iva']) || buscarColumna(headers, ['impuesto'])
  const colTotal = buscarColumna(headers, ['total', 'importe']) || buscarColumna(headers, ['cuota'])
  const colEstado = buscarColumna(headers, ['estado', 'state'])
  const colTipo = buscarColumna(headers, ['tipo', 'tipo doc', 'tipo de'])

  if (!colFecha || (!colContraparte && !colNum)) return []

  const resultado: FilaFacturaImportable[] = []
  for (const fila of filas) {
    const base = parsearNumero(celda(fila, colBase))
    const total = parsearNumero(celda(fila, colTotal))
    const iva = normalizarIva(celda(fila, colIva))
    const tipoTexto = normalizarTexto(celda(fila, colTipo) ?? '')
    const esIngreso = tipoTexto.includes('emitida') || tipoTexto.includes('venta') || tipoTexto === '' || tipoTexto.includes('factura emitida')

    if (base === null && total === null) continue

    const totalBase = total ?? 0
    const baseImponible = base !== null ? Math.round(base * 100) : Math.round((totalBase / (1 + iva / 100)) * 100)
    const totalCents = total !== null ? Math.round(total * 100) : Math.round(baseImponible * (1 + iva / 100))

    const f: FilaFacturaImportable = {
      numero: colNum ? String(celda(fila, colNum) ?? '').trim() : '',
      tipo: esIngreso ? 'ingreso' : 'gasto',
      emisorReceptor: String(celda(fila, colContraparte) ?? '').trim(),
      nifContraparte: colNif ? String(celda(fila, colNif) ?? '').trim() || null : null,
      fechaEmision: parsearFecha(celda(fila, colFecha)) ?? new Date().toISOString().slice(0, 10),
      baseImponible: baseImponible || 0,
      iva,
      total: totalCents,
      estado: normalizarEstado(celda(fila, colEstado)),
      categoriaGasto: esIngreso ? null : 'otros',
    }
    if (filaValida(f)) resultado.push(f)
  }
  return resultado
}

function mapearContaplus(headers: string[], filas: Record<string, unknown>[]): FilaFacturaImportable[] {
  const colFecha = buscarColumna(headers, ['fecha', 'date'])
  const colTipo = buscarColumna(headers, ['tipo', 'type'])
  const colNum = buscarColumna(headers, ['numero', 'reference', 'num'])
  const colNif = buscarColumna(headers, ['nif', 'cif'])
  const colContraparte = buscarColumna(headers, ['cliente', 'third party', 'tercero', 'contraparte'])
  const colBase = buscarColumna(headers, ['base'])
  const colIva = buscarColumna(headers, ['iva'])
  const colTotal = buscarColumna(headers, ['total']) || buscarColumna(headers, ['importe'])
  const colDebito = buscarColumna(headers, ['debit', 'debe'])
  const colCredito = buscarColumna(headers, ['credit', 'haber'])
  const colCat = buscarColumna(headers, ['categoria', 'categor', 'label'])

  if (!colFecha || (!colContraparte && !colNum)) return []

  const resultado: FilaFacturaImportable[] = []
  for (const fila of filas) {
    const tipoTexto = normalizarTexto(celda(fila, colTipo) ?? '')
    const base = parsearNumero(celda(fila, colBase))
    const total = parsearNumero(celda(fila, colTotal))
    const debito = parsearNumero(celda(fila, colDebito))
    const credito = parsearNumero(celda(fila, colCredito))
    const importeNumerico = total ?? credito ?? debito ?? base

    const iva = normalizarIva(celda(fila, colIva))
    const baseImponible = base !== null ? Math.round(base * 100) : importeNumerico !== null ? Math.round(importeNumerico * 100) : 0
    const totalCents = total !== null ? Math.round(total * 100) : Math.round(baseImponible * (1 + iva / 100))

    const esIngreso = tipoTexto.includes('venta') || debito === null || debito === 0 || total !== null
    const contraparte = String(celda(fila, colContraparte) ?? '').trim()
    const tipo = (esIngreso && !tipoTexto.includes('compra')) ? 'ingreso' : 'gasto'

    const f: FilaFacturaImportable = {
      numero: colNum ? String(celda(fila, colNum) ?? '').trim() : '',
      tipo,
      emisorReceptor: contraparte,
      nifContraparte: colNif ? String(celda(fila, colNif) ?? '').trim() || null : null,
      fechaEmision: parsearFecha(celda(fila, colFecha)) ?? new Date().toISOString().slice(0, 10),
      baseImponible,
      iva,
      total: totalCents,
      estado: 'pendiente',
      categoriaGasto: tipo === 'gasto' ? normalizarCategoria(celda(fila, colCat)) : null,
    }
    if (filaValida(f)) resultado.push(f)
  }
  return resultado
}

function mapearGenerico(headers: string[], filas: Record<string, unknown>[]): FilaFacturaImportable[] {
  const colFecha = buscarColumna(headers, ['fecha', 'date'])
  const colContraparte = buscarColumna(headers, ['cliente', 'proveedor', 'concepto', 'descripcion', 'tercero', 'emisor', 'nombre'])
  const colNif = buscarColumna(headers, ['nif', 'cif'])
  const colBase = buscarColumna(headers, ['base imp', 'base'])
  const colIva = buscarColumna(headers, ['iva'])
  const colTotal = buscarColumna(headers, ['total', 'importe', 'cantidad', 'amount'])
  const colTipo = buscarColumna(headers, ['tipo'])
  const colEstado = buscarColumna(headers, ['estado'])

  if (!colFecha || (!colContraparte && !colTotal)) return []

  const resultado: FilaFacturaImportable[] = []
  for (const fila of filas) {
    const base = parsearNumero(celda(fila, colBase))
    const total = parsearNumero(celda(fila, colTotal))
    const iva = normalizarIva(celda(fila, colIva))

    if (base === null && total === null) continue

    const baseImponible = base !== null ? Math.round(base * 100) : Math.round((total! / (1 + iva / 100)) * 100)
    const totalCents = total !== null ? Math.round(total * 100) : Math.round(baseImponible * (1 + iva / 100))

    const tipoTexto = normalizarTexto(celda(fila, colTipo) ?? '')
    const esIngreso = tipoTexto.includes('ingreso') || tipoTexto.includes('venta') || tipoTexto === ''

    const f: FilaFacturaImportable = {
      numero: String(fila['Numero'] ?? fila['Nº'] ?? fila['N'] ?? '').trim(),
      tipo: esIngreso ? 'ingreso' : 'gasto',
      emisorReceptor: String(celda(fila, colContraparte) ?? '').trim(),
      nifContraparte: colNif ? String(celda(fila, colNif) ?? '').trim() || null : null,
      fechaEmision: parsearFecha(celda(fila, colFecha)) ?? new Date().toISOString().slice(0, 10),
      baseImponible,
      iva,
      total: totalCents,
      estado: normalizarEstado(celda(fila, colEstado)),
      categoriaGasto: esIngreso ? null : normalizarCategoria(fila['Categoria'] ?? fila['Categoría']),
    }
    if (filaValida(f)) resultado.push(f)
  }
  return resultado
}

export function detectarOrigen(headers: string[], filas: Record<string, unknown>[]): OrigenImportacion {
  const textoEncabezados = headers.map(h => normalizarTexto(h)).join(' ')
  const textoFilas = filas.slice(0, 10).map(f => Object.values(f).map(v => normalizarTexto(v)).join(' ')).join(' ')

  if (textoEncabezados.includes('categoria') && (textoEncabezados.includes('concepto') || textoEncabezados.includes('cuenta')) && (textoFilas.includes('venta') || textoFilas.includes('gasto'))) {
    return 'quipu'
  }
  if ((textoEncabezados.includes('base') || textoEncabezados.includes('base imp')) && (textoEncabezados.includes('cliente') || textoEncabezados.includes('proveedor')) && (textoEncabezados.includes('nif') || textoEncabezados.includes('cif'))) {
    return 'holded'
  }
  if (textoEncabezados.includes('third party') || (textoEncabezados.includes('cliente') && textoEncabezados.includes('base'))) {
    return 'contaplus'
  }
  return 'generico'
}

export async function parsearArchivoImportacion(
  file: File,
  origen?: OrigenImportacion
): Promise<ResultadoImportacion> {
  const errores: string[] = []
  const filas = await leerObjetosDeArchivo(file)
  if (filas.length === 0) {
    return { origen: origen ?? 'generico', facturas: [], errores: ['El archivo no contiene filas con datos'] }
  }

  const headers = Object.keys(filas[0]!)
  const origenFinal = origen ?? detectarOrigen(headers, filas)

  let facturas: FilaFacturaImportable[] = []
  switch (origenFinal) {
    case 'quipu':
      facturas = mapearQuipu(headers, filas)
      break
    case 'holded':
      facturas = mapearHolded(headers, filas)
      break
    case 'contaplus':
      facturas = mapearContaplus(headers, filas)
      break
    case 'generico':
      facturas = mapearGenerico(headers, filas)
      break
  }

  if (facturas.length === 0) {
    errores.push('No se pudieron mapear filas de facturas. Revisa las columnas del archivo.')
  }

  return { origen: origenFinal, facturas, errores }
}

export function mapearNominas(headers: string[], filas: Record<string, unknown>[]): FilaNominaImportable[] {
  const colEmpleada = buscarColumna(headers, ['empleada', 'empleado', 'trabajador', 'nombre', 'persona'])
  const colMes = buscarColumna(headers, ['mes', 'month'])
  const colAnyo = buscarColumna(headers, ['anyo', 'año', 'year'])
  const colBruto = buscarColumna(headers, ['salario bruto', 'bruto', 'salario'])
  const colIrpf = buscarColumna(headers, ['irpf', 'retencion'])
  const colSs = buscarColumna(headers, ['seguridad social', 'seg social', 'ss'])
  const colNeto = buscarColumna(headers, ['neto', 'salario neto'])

  if (!colEmpleada || (!colBruto && !colNeto)) return []

  const resultado: FilaNominaImportable[] = []
  for (const fila of filas) {
    const bruto = parsearNumero(celda(fila, colBruto))
    const neto = parsearNumero(celda(fila, colNeto))
    const irpf = parsearNumero(celda(fila, colIrpf)) ?? 0
    const ss = parsearNumero(celda(fila, colSs)) ?? 0

    if (bruto === null && neto === null) continue

    const brutoCents = Math.round((bruto ?? neto ?? 0) * 100)
    const netoCents = neto !== null
      ? Math.round(neto * 100)
      : brutoCents - Math.round(brutoCents * (irpf / 100)) - Math.round(ss * 100)

    const mesTexto = celda(fila, colMes)
    const mes = typeof mesTexto === 'number'
      ? mesTexto
      : ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
          .findIndex(m => normalizarTexto(mesTexto).includes(m)) + 1

    const anyo = parseInt(String(celda(fila, colAnyo) ?? new Date().getFullYear()), 10) || new Date().getFullYear()

    resultado.push({
      empleada: String(celda(fila, colEmpleada) ?? '').trim(),
      mes: mes || new Date().getMonth() + 1,
      anyo,
      salarioBruto: brutoCents,
      irpf: bruto ? irpf : 0,
      seguridadSocial: Math.round(ss * 100),
      neto: netoCents,
      rol: 'empleado',
    })
  }
  return resultado
}

export function mapearPropiedades(headers: string[], filas: Record<string, unknown>[]): FilaPropiedadImportable[] {
  const colDireccion = buscarColumna(headers, ['direccion', 'dirección', 'calle', 'inmueble', 'propiedad'])
  const colIngresos = buscarColumna(headers, ['ingresos', 'renta', 'importe', 'mensualidad', 'income'])
  const colInquilino = buscarColumna(headers, ['inquilino', 'arrendatario', 'nombre', 'cliente'])
  const colNif = buscarColumna(headers, ['nif', 'cif'])

  if (!colDireccion) return []

  const resultado: FilaPropiedadImportable[] = []
  for (const fila of filas) {
    const direccion = String(celda(fila, colDireccion) ?? '').trim()
    if (!direccion) continue
    const ingresos = Math.round((parsearNumero(celda(fila, colIngresos)) ?? 0) * 100)
    resultado.push({
      direccion,
      ingresos,
      inquilinoNombre: colInquilino ? String(celda(fila, colInquilino) ?? '').trim() : '',
      inquilinoNif: colNif ? String(celda(fila, colNif) ?? '').trim() || null : null,
    })
  }
  return resultado
}