export interface FacturaBasica {
  id: string
  numero: string
  emisorReceptor: string
  total: number
  fechaEmision: string
}

export interface DuplicadoDetectado {
  factura1: FacturaBasica
  factura2: FacturaBasica
  razon: string
}

export function detectarDuplicados(facturas: FacturaBasica[]): DuplicadoDetectado[] {
  const duplicados: DuplicadoDetectado[] = []

  for (let i = 0; i < facturas.length; i++) {
    const a = facturas[i]
    if (!a) continue
    for (let j = i + 1; j < facturas.length; j++) {
      const b = facturas[j]
      if (!b) continue

      if (a.emisorReceptor === b.emisorReceptor && a.total === b.total) {
        const diffDias = Math.abs(
          (new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDias === 0) {
          duplicados.push({
            factura1: a,
            factura2: b,
            razon: `Misma contraparte, mismo importe y misma fecha`,
          })
        } else if (diffDias <= 7) {
          duplicados.push({
            factura1: a,
            factura2: b,
            razon: `Misma contraparte, mismo importe, ${Math.round(diffDias)} días de diferencia`,
          })
        }
      }
    }
  }

  return duplicados
}
