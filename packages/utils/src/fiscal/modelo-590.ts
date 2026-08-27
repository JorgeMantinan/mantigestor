/**
 * Modelo 590 — Declaración informativa de operaciones vinculadas.
 *
 * Sociedades que realicen operaciones con partes vinculadas por encima de los umbrales
 * deben presentar el 590 y, en su caso, elaborar documentación específica. Este módulo
 * agrega el valor de las operaciones vinculadas por tipo y evalúa la obligación de
 * documentación individual.
 */

export interface OperacionVinculada590 {
  tipo: 'servicios' | 'financieras' | 'venta_bienes' | 'compra_bienes' | 'otras'
  importe: number
}

export interface DatosModelo590 {
  /** Importe neto de la cifra de negocios del ejercicio (€) */
  cifraNegocios: number
  /** Operaciones vinculadas del ejercicio */
  operaciones: OperacionVinculada590[]
  /** true si la operación es con una administración pública */
  conAdministracion?: boolean
}

export interface ResultadoModelo590 {
  totalOperaciones: number
  /** ¿Debe presentar el modelo 590? (sí si supera el umbral de 250.000 € en una misma vinculada o el total) */
  debePresentar: boolean
  /** Umbral aplicado para la obligación de presentación */
  umbralPresentacion: number
  /** ¿Debe elaborar documentación individual? (cifra de negocios ≥ 10 M€ y operaciones ≥ 250.000 €) */
  debeDocumentar: boolean
  porTipo: Array<{ tipo: OperacionVinculada590['tipo']; importe: number; etiqueta: string }>
  avisos: string[]
}

const UMBRAL_PRESENTACION = 250_000
const UMBRAL_DOC = 10_000_000

const ETIQUETAS: Record<OperacionVinculada590['tipo'], string> = {
  servicios: 'Servicios',
  financieras: 'Operaciones financieras',
  venta_bienes: 'Venta de bienes',
  compra_bienes: 'Compra de bienes',
  otras: 'Otras',
}

export function calcularModelo590(datos: DatosModelo590): ResultadoModelo590 {
  const avisos: string[] = []

  const porTipo = (Object.keys(ETIQUETAS) as OperacionVinculada590['tipo'][]).map((tipo) => ({
    tipo,
    importe: datos.operaciones.filter((o) => o.tipo === tipo).reduce((s, o) => s + o.importe, 0),
    etiqueta: ETIQUETAS[tipo],
  }))

  const totalOperaciones = datos.operaciones.reduce((s, o) => s + o.importe, 0)

  // Art. 18 de la LIS: hay que presentar el 590 si la cifra de negocios supera 250.000 €
  // y se realizan operaciones vinculadas que superen los umbrales (cuantía individual 250.000 €).
  const superaUmbralIndividual = datos.operaciones.some((o) => o.importe > UMBRAL_PRESENTACION)
  const debePresentar = datos.cifraNegocios > UMBRAL_PRESENTACION && superaUmbralIndividual

  // Documentación: cifra de negocios ≥ 10 M€ y operaciones vinculadas que superen 250.000 €
  const debeDocumentar =
    datos.cifraNegocios >= UMBRAL_DOC &&
    datos.operaciones.some((o) => o.importe > UMBRAL_PRESENTACION)

  if (!debePresentar && totalOperaciones > 0) {
    avisos.push('No superas el umbral individual de 250.000 € en ninguna operación vinculada: no estás obligado a presentar el 590.')
  }

  return {
    totalOperaciones,
    debePresentar,
    umbralPresentacion: UMBRAL_PRESENTACION,
    debeDocumentar,
    porTipo,
    avisos,
  }
}
