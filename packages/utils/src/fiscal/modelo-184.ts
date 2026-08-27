/**
 * Modelo 184 — Entidades en régimen de atribución de rentas
 *
 * Declaración informativa anual de sociedades civiles, comunidades de bienes
 * y herencias yacentes que tributan por atribución de rentas.
 */

export type TipoEntidad184 = 'sociedad_civil' | 'comunidad_bienes' | 'herencia_yacente'

export interface DatosModelo184 {
  tipo: TipoEntidad184
  participes: number
  rentas: {
    inmobiliarias: number
    mobiliarias: number
    actividades: number
    ganancias: number
  }
}

export interface ResultadoModelo184 {
  totalRentas: number
  numParticipes: number
  tipoEntidad: string
  rentaPorParticipe: number
}

const LABELS_TIPO: Record<TipoEntidad184, string> = {
  sociedad_civil: 'Sociedad Civil',
  comunidad_bienes: 'Comunidad de Bienes',
  herencia_yacente: 'Herencia Yacente',
}

export function calcularModelo184(datos: DatosModelo184): ResultadoModelo184 {
  const totalRentas = datos.rentas.inmobiliarias + datos.rentas.mobiliarias +
    datos.rentas.actividades + datos.rentas.ganancias
  const numParticipes = Math.max(1, datos.participes)
  const rentaPorParticipe = Math.round(totalRentas / numParticipes)

  return {
    totalRentas,
    numParticipes,
    tipoEntidad: LABELS_TIPO[datos.tipo],
    rentaPorParticipe,
  }
}

function formatEUR(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export const TIPOS_ENTIDAD_184 = [
  { valor: 'sociedad_civil', label: 'Sociedad Civil' },
  { valor: 'comunidad_bienes', label: 'Comunidad de Bienes' },
  { valor: 'herencia_yacente', label: 'Herencia Yacente' },
] as const
