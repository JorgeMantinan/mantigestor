// Art. 20 LIRPF, redacción RDL 4/2024 (ejercicios 2023-2025, prorrogable).
// Valores contrastados con AEAT Manual Renta 2025 (cap. 14) y marcados OFFICIAL_VERIFIED en BD.

const TRAMO1_HASTA_CENTIMOS = 1_485_200 // 14.852,00 €
const CUOTA_FIJA_CENTIMOS = 730_200 // 7.302,00 €
const COEFICIENTE_PENDIENTE = 175 // 1,75 por unidad
const LIMITE_TRAMO2_CENTIMOS = 1_767_352 // 17.673,52 €
const CUOTA_TRAMO3_BASE_CENTIMOS = 236_434 // 2.364,34 €
const COEFICIENTE_TRAMO3 = 114 // 1,14 por unidad

export function reduccionRendimientosTrabajoCents(rendimientoNetoCentimos: number): number {
  if (!Number.isInteger(rendimientoNetoCentimos)) throw new Error('El rendimiento neto debe ser un entero en céntimos')
  if (rendimientoNetoCentimos < 0) throw new Error('El rendimiento neto no puede ser negativo')

  if (rendimientoNetoCentimos <= TRAMO1_HASTA_CENTIMOS) return CUOTA_FIJA_CENTIMOS

  const eurosExcesoTramo2 = (rendimientoNetoCentimos - TRAMO1_HASTA_CENTIMOS) / 100
  if (rendimientoNetoCentimos <= LIMITE_TRAMO2_CENTIMOS) {
    return Math.max(0, Math.round(CUOTA_FIJA_CENTIMOS - COEFICIENTE_PENDIENTE * eurosExcesoTramo2))
  }

  const eurosExcesoTramo3 = (rendimientoNetoCentimos - LIMITE_TRAMO2_CENTIMOS) / 100
  return Math.max(
    0,
    Math.round(CUOTA_TRAMO3_BASE_CENTIMOS - COEFICIENTE_TRAMO3 * eurosExcesoTramo3),
  )
}
