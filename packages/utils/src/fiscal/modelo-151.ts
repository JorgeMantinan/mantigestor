/**
 * Modelo 151 — Comunicación de alta/renuncia al régimen de estimación objetiva
 * Para autónomos que renuncian o revocan la estimación objetiva (módulos)
 *
 * Plazos:
 * - Alta: antes del 31 de enero del ejercicio
 * - Renuncia: durante el mes de diciembre del anterior o en el momento de la alta
 * - Revocación: igual plazo que renuncia
 */

export interface DatosModelo151 {
  tipo: 'alta' | 'renuncia' | 'revocacion'
  nif: string
  nombre: string
  actividad: string
  codigoActividad: string // IAE
  fechaInicio?: string
  fechaEfectos?: string
}

export interface ResultadoModelo151 {
  tipo: string
  descripcion: string
  plazo: string
  obligatorio: boolean
  observaciones: string[]
}

export function calcularModelo151(datos: DatosModelo151): ResultadoModelo151 {
  const ahora = new Date()
  const mes = ahora.getMonth() + 1
  const dia = ahora.getDate()

  const observaciones: string[] = []

  switch (datos.tipo) {
    case 'alta': {
      const enPlazo = mes === 1 && dia <= 31
      observaciones.push('El alta debe realizarse antes del 31 de enero del ejercicio')
      if (!enPlazo) {
        observaciones.push('⚠️ Fuera de plazo — se aplicará a partir del próximo ejercicio')
      }
      return {
        tipo: 'Alta',
        descripcion: 'Alta en régimen de estimación objetiva',
        plazo: '31 de enero del ejercicio',
        obligatorio: false,
        observaciones,
      }
    }

    case 'renuncia': {
      const enPlazo = mes === 12
      observaciones.push('La renuncia debe realizarse durante diciembre del ejercicio anterior')
      observaciones.push('Si es alta nueva, la renuncia puede hacerse en el momento del alta')
      if (!enPlazo) {
        observaciones.push('⚠️ Fuera de plazo — se aplicará a partir del siguiente ejercicio')
      }
      return {
        tipo: 'Renuncia',
        descripcion: 'Renuncia al régimen de estimación objetiva',
        plazo: 'Diciembre del ejercicio anterior',
        obligatorio: false,
        observaciones,
      }
    }

    case 'revocacion': {
      const enPlazo = mes === 12
      observaciones.push('La revocación tiene el mismo plazo que la renuncia')
      observaciones.push('Una vez revocada, no se podrá volver a estimación objetiva durante 3 años')
      if (!enPlazo) {
        observaciones.push('⚠️ Fuera de plazo')
      }
      return {
        tipo: 'Revocación',
        descripcion: 'Revocación del régimen de estimación objetiva',
        plazo: 'Diciembre del ejercicio anterior',
        obligatorio: false,
        observaciones,
      }
    }

    default: {
      return {
        tipo: datos.tipo,
        descripcion: 'Tipo no reconocido',
        plazo: 'Consultar',
        obligatorio: false,
        observaciones: ['Tipo de operación no reconocido'],
      }
    }
  }
}

/**
 * Comprueba si un autónomo puede estar en estimación objetiva
 * (simplificación: muestra requisitos generales)
 */
export function requisitosEstimacionObjetiva(): string[] {
  return [
    'No superar los límites del artículo 31.1 LIRPF',
    'No haber renunciado o revocado en los últimos 3 años',
    'No tener más de un local de negocio (excepto hostelería)',
    'No tener más de 3 empleados simultáneamente',
    'Actividad incluida en el Real Decreto de módulos',
    'No facturar más de 150.000€ anuales',
  ]
}
