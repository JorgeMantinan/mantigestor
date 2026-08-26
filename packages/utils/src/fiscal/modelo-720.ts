/**
 * Modelo 720 — Declaración informativa sobre bienes y derechos en el extranjero
 * Obligatorio si el valor conjuntode bienes/derechos en un país supere los 50.000€
 *
 * Tipos de bienes:
 * 1. Cuentas en entidades financieras
 * 2. Valores, participaciones y seguros
 * 3. Bienes inmuebles
 * 4. Otros bienes muebles
 */

export interface BienExtranjero {
  id: string
  tipo: 'cuentas' | 'valores' | 'inmuebles' | 'otros'
  pais: string
  descripcion: string
  valor: number
  fechaObtencion?: string
  titularidad?: 'titular' | 'copropietario' | 'apoderado' | 'beneficiario'
}

export interface DatosModelo720 {
  bienes: BienExtranjero[]
}

export interface ResultadoModelo720 {
  totalCuentas: number
  totalValores: number
  totalInmuebles: number
  totalOtros: number
  valorTotal: number
  obligatorio: boolean
  porPais: Record<string, number>
  resumen: string
}

const UMBRAL_OBLIGATORIO = 50_000 // €50.000

export function calcularModelo720(datos: DatosModelo720): ResultadoModelo720 {
  const { bienes } = datos

  const totalCuentas = bienes
    .filter(b => b.tipo === 'cuentas')
    .reduce((sum, b) => sum + b.valor, 0)

  const totalValores = bienes
    .filter(b => b.tipo === 'valores')
    .reduce((sum, b) => sum + b.valor, 0)

  const totalInmuebles = bienes
    .filter(b => b.tipo === 'inmuebles')
    .reduce((sum, b) => sum + b.valor, 0)

  const totalOtros = bienes
    .filter(b => b.tipo === 'otros')
    .reduce((sum, b) => sum + b.valor, 0)

  const valorTotal = totalCuentas + totalValores + totalInmuebles + totalOtros

  // Agrupar por país
  const porPais: Record<string, number> = {}
  for (const bien of bienes) {
    porPais[bien.pais] = (porPais[bien.pais] || 0) + bien.valor
  }

  const obligatorio = valorTotal > UMBRAL_OBLIGATORIO

  const resumen = obligatorio
    ? `OBLIGATORIO: El valor total (${formatEUR(valorTotal)}) supera el umbral de ${formatEUR(UMBRAL_OBLIGATORIO)}`
    : `No obligatorio. Valor total: ${formatEUR(valorTotal)} (umbral: ${formatEUR(UMBRAL_OBLIGATORIO)})`

  return {
    totalCuentas,
    totalValores,
    totalInmuebles,
    totalOtros,
    valorTotal,
    obligatorio,
    porPais,
    resumen,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

// Países más comunes
export const PAISES_COMUNES = [
  'Alemania', 'Argentina', 'Australia', 'Bélgica', 'Brasil',
  'Canadá', 'Chile', 'China', 'Colombia', 'Corea del Sur',
  'Emiratos Árabes', 'España', 'Estados Unidos', 'Francia',
  'Hong Kong', 'Irlanda', 'Isle of Man', 'Israel', 'Italia',
  'Japón', 'Luxemburgo', 'México', 'Mónaco', 'Países Bajos',
  'Panamá', 'Perú', 'Portugal', 'Reino Unido', 'Singapur',
  'Suecia', 'Suiza', 'Uruguay', 'Otro',
].sort()
