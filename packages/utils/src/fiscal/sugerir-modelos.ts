/**
 * Sugiere qué modelos fiscales afectan a una factura concreta,
 * basándose en sus campos (tipo, IVA, NIF contraparte, etc.).
 */

export interface FacturaParaSugerir {
  tipo: 'ingreso' | 'gasto' | null
  iva: number | null
  baseImponible: number | null
  nifContraparte: string | null
}

export interface ModeloSugerido {
  modelo: string
  seccion: string
  razon: string
}

const PREFIJOS_UE: Record<string, string> = {
  AT: 'Austria', BE: 'Bélgica', BG: 'Bulgaria', HR: 'Croacia',
  CY: 'Chipre', CZ: 'Chequia', DK: 'Dinamarca', EE: 'Estonia',
  FI: 'Finlandia', FR: 'Francia', DE: 'Alemania', GR: 'Grecia',
  HU: 'Hungría', IE: 'Irlanda', IT: 'Italia', LV: 'Letonia',
  LT: 'Lituania', LU: 'Luxemburgo', MT: 'Malta', NL: 'Países Bajos',
  PL: 'Polonia', PT: 'Portugal', RO: 'Rumanía', SK: 'Eslovaquia',
  SI: 'Eslovenia', SE: 'Suecia',
}

function esIntraUE(nif: string | null): boolean {
  if (!nif) return false
  const upper = nif.toUpperCase().trim()
  const prefijo = upper.slice(0, 2)
  return prefijo in PREFIJOS_UE && upper.length > 2
}

function paisUE(nif: string | null): string | null {
  if (!nif) return null
  const prefijo = nif.toUpperCase().trim().slice(0, 2)
  return PREFIJOS_UE[prefijo] ?? null
}

/**
 * Dada una factura, devuelve los modelos AEAT que podrían verse afectados.
 * No tiene en cuenta el perfil del usuario (eso se puede añadir después).
 */
export function sugerirModelos(factura: FacturaParaSugerir): ModeloSugerido[] {
  const modelos: ModeloSugerido[] = []
  const { tipo, iva, baseImponible, nifContraparte } = factura
  const esGasto = tipo === 'gasto'
  const esIngreso = tipo === 'ingreso'

  // ── 303 (IVA trimestral) — siempre aplica ──
  if (esGasto) {
    modelos.push({
      modelo: '303',
      seccion: 'modelo303',
      razon: 'IVA soportado deducible en declaraciones trimestrales',
    })
  } else if (esIngreso) {
    modelos.push({
      modelo: '303',
      seccion: 'modelo303',
      razon: 'IVA repercutido en declaraciones trimestrales',
    })
  } else {
    modelos.push({
      modelo: '303',
      seccion: 'modelo303',
      razon: 'IVA declarable en liquidación trimestral',
    })
  }

  // ── 130/131 (IRPF trimestral) — aplica a autónomos ──
  if (esGasto) {
    modelos.push({
      modelo: '130',
      seccion: 'modelo130',
      razon: 'Gasto deducible en pagos fraccionados de IRPF',
    })
  } else if (esIngreso) {
    modelos.push({
      modelo: '130',
      seccion: 'modelo130',
      razon: 'Ingreso computable en pagos fraccionados de IRPF',
    })
  }

  // ── 390 (resumen anual IVA) — siempre aplica ──
  modelos.push({
    modelo: '390',
    seccion: 'modelo390',
    razon: 'Resumen anual de IVA — esta factura se incluye',
  })

  // ── 349 (operaciones intracomunitarias) ──
  if (esIntraUE(nifContraparte)) {
    const pais = paisUE(nifContraparte)
    modelos.push({
      modelo: '349',
      seccion: 'modelo349',
      razon: `Operación intracomunitaria con ${pais ?? 'país UE'} — declarar en modelo 349`,
    })

    // Si IVA 0% y intra-UE, posiblemente exenta en 303
    if (iva === 0) {
      modelos.push({
        modelo: '303',
        seccion: 'modelo303',
        razon: 'Exenta por artículo 25 Directiva IVA — casilla de exentas en 303',
      })
    }
  }

  // ── 111 (retenciones) — si la factura sugiere retención ──
  if (iva === 21 && esIngreso) {
    // Ingreso con IVA 21% podría tener retención de profesional
    // (no podemos saberlo seguro sin más datos, pero es una pista)
    // Solo lo sugerimos si el NIF parece de empresa (9 dígitos)
    const nifLimpio = nifContraparte?.replace(/[^0-9A-Za-z]/g, '') ?? ''
    if (/^\d{8}[A-Za-z]$/.test(nifLimpio) || /^[A-Za-z]\d{7}[A-Za-z0-9]?$/.test(nifLimpio)) {
      modelos.push({
        modelo: '111',
        seccion: 'modelo111',
        razon: 'Retenciones por profesionales — verificar si aplica retención IRPF',
      })
    }
  }

  // ── Deduplicar por modelo ──
  const vistos = new Set<string>()
  return modelos.filter(m => {
    if (vistos.has(m.modelo)) return false
    vistos.add(m.modelo)
    return true
  })
}
