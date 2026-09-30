import { describe, it, expect } from 'vitest'
import {
  generarModelosTrimestrales,
  fingerprintModelo,
  trimestreDeFecha,
  MODELOS_TRIMESTRALES,
  type FacturaGeneradora,
  type NominaGeneradora,
  type ModeloGenerado,
} from '@/lib/fiscal/generador-modelos'

const ANYO = 2026

function factura(parcial: Partial<FacturaGeneradora> & { fechaEmision: string }): FacturaGeneradora {
  const base = parcial.baseImponible ?? 0
  const pct = parcial.iva ?? 21
  return {
    id: parcial.id ?? crypto.randomUUID(),
    tipo: parcial.tipo ?? 'ingreso',
    emisorReceptor: parcial.emisorReceptor ?? 'Cliente Demo SL',
    fechaEmision: parcial.fechaEmision,
    baseImponible: base,
    iva: pct,
    total: parcial.total ?? base + Math.round((base * pct) / 100),
    deducible: parcial.deducible ?? true,
  }
}

function nomina(parcial: Partial<NominaGeneradora>): NominaGeneradora {
  return {
    empleada: parcial.empleada ?? 'Ana',
    mes: parcial.mes ?? 1,
    anyo: parcial.anyo ?? ANYO,
    salarioBruto: parcial.salarioBruto ?? 0,
    irpf: parcial.irpf ?? 0,
    rol: parcial.rol ?? 'empleado',
  }
}

function porModelo(modelos: ModeloGenerado[], modelo: string): ModeloGenerado {
  const m = modelos.find(x => x.modelo === modelo)
  if (!m) throw new Error(`Modelo ${modelo} no generado`)
  return m
}

describe('generarModelosTrimestrales — modelo 303', () => {
  it('calcula IVA repercutido y soportado del trimestre (céntimos, como en BD)', () => {
    const facturas = [
      factura({ fechaEmision: '2026-02-15', baseImponible: 10_000_000, iva: 21 }), // 100.000€ ingreso
      factura({ fechaEmision: '2026-03-10', tipo: 'gasto', emisorReceptor: 'Proveedor SA', baseImponible: 4_000_000, iva: 21 }), // 40.000€ gasto
    ]

    const modelos = generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas: [] })
    const m303 = porModelo(modelos, '303')

    expect(m303.datos.totalCuotaRepercutida).toBe(2_100_000) // 21.000€
    expect(m303.datos.totalCuotaSoportada).toBe(840_000) // 8.400€
    expect(m303.datos.resultadoLiquidacion).toBe(1_260_000) // 12.600€
    expect(m303.totalCents).toBe(1_260_000)
    expect(m303.periodicidad).toBe('trimestral')
    expect(m303.trimestre).toBe(1)
    expect(m303.anyo).toBe(ANYO)
  })

  it('arrastra la compensación de trimestres anteriores dentro del año', () => {
    const facturas = [
      // T1 con resultado negativo → se compensa
      factura({ fechaEmision: '2026-02-15', tipo: 'gasto', emisorReceptor: 'Proveedor SA', baseImponible: 10_000_000, iva: 21 }),
      // T3 positivo: debe minar el saldo negativo pendiente del T1
      factura({ fechaEmision: '2026-08-15', baseImponible: 5_000_000, iva: 21 }),
    ]

    const t1 = porModelo(generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas: [] }), '303')
    expect(t1.datos.aCompensar).toBe(2_100_000)

    const t3 = porModelo(generarModelosTrimestrales({ anyo: ANYO, trimestre: 3, facturas, nominas: [] }), '303')
    expect(t3.datos.compensacionAplicada).toBe(1_050_000) // min(2.100.000, 1.050.000)
    expect(t3.datos.aIngresar).toBe(0) // nada a pagar: el IVA del trimestre se compensa
    expect(t3.totalCents).toBe(1_050_000) // saldo que queda por compensar al trimestre siguiente
  })

  it('excluye las proformas (tipo proforma) del cálculo', () => {
    const facturas = [
      factura({ fechaEmision: '2026-02-15', baseImponible: 1_000_000, iva: 21 }),
      factura({ fechaEmision: '2026-02-20', tipo: 'proforma', baseImponible: 99_000_000, iva: 21 }),
    ]

    const m303 = porModelo(generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas: [] }), '303')
    expect(m303.datos.totalCuotaRepercutida).toBe(210_000) // solo la factura real
    expect(m303.datos.numFacturas).toBe(1)
  })
})

describe('generarModelosTrimestrales — modelo 130', () => {
  it('aplica 20% al beneficio acumulado y descuenta retenciones soportadas', () => {
    const facturas = [
      factura({ fechaEmision: '2026-02-15', baseImponible: 10_000_000, iva: 21 }), // 100.000€ ingresos T1
      factura({ fechaEmision: '2026-03-10', tipo: 'gasto', emisorReceptor: 'Proveedor SA', baseImponible: 4_000_000, iva: 21, deducible: true }), // 40.000€ gastos
    ]
    const nominas = [
      nomina({ rol: 'empleado', mes: 1, salarioBruto: 300_000, irpf: 15 }), // retención 45.000 ctvs
    ]

    const m130 = porModelo(generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas }), '130')

    expect(m130.datos.beneficioAcumulado).toBe(6_000_000) // 100.000 − 40.000 €
    expect(m130.datos.cuotaAcumulada).toBe(1_200_000) // 20%
    expect(m130.datos.pagosAnteriores).toBe(0)
    expect(m130.datos.retencionesSoportadas).toBe(45_000)
    expect(m130.totalCents).toBe(1_155_000) // 1.200.000 − 45.000
  })

  it('no ingresa nada si el beneficio acumulado es negativo', () => {
    const facturas = [
      factura({ fechaEmision: '2026-02-15', tipo: 'gasto', emisorReceptor: 'Proveedor SA', baseImponible: 8_000_000, iva: 21 }),
    ]

    const m130 = porModelo(generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas: [] }), '130')
    expect(m130.datos.cuotaAcumulada).toBe(0)
    expect(m130.totalCents).toBe(0)
  })
})

describe('generarModelosTrimestrales — modelo 111', () => {
  it('agrupa nóminas de empleador por trabajador y gastos por profesional al 15%', () => {
    const facturas = [
      factura({ fechaEmision: '2026-01-15', tipo: 'gasto', emisorReceptor: 'Consultoría López', baseImponible: 2_000_000, iva: 21 }),
      factura({ fechaEmision: '2026-02-15', tipo: 'gasto', emisorReceptor: 'Consultoría López', baseImponible: 1_000_000, iva: 21 }),
      factura({ fechaEmision: '2026-03-15', tipo: 'gasto', emisorReceptor: 'Otro Proveedor', baseImponible: 4_000_000, iva: 21 }),
      // De otro trimestre: no debe contar en T1
      factura({ fechaEmision: '2026-05-15', tipo: 'gasto', emisorReceptor: 'Consultoría López', baseImponible: 9_000_000, iva: 21 }),
      // Ingresos: no generan retención practicada
      factura({ fechaEmision: '2026-01-20', baseImponible: 5_000_000, iva: 21 }),
    ]
    const nominas = [
      nomina({ rol: 'jefe', empleada: 'Ana', mes: 1, salarioBruto: 150_000, irpf: 15 }),
      nomina({ rol: 'jefe', empleada: 'Ana', mes: 2, salarioBruto: 150_000, irpf: 15 }),
      nomina({ rol: 'jefe', empleada: 'Ana', mes: 3, salarioBruto: 150_000, irpf: 15 }),
      nomina({ rol: 'jefe', empleada: 'Luis', mes: 1, salarioBruto: 200_000, irpf: 10 }),
      // Empleado (el perfil es asalariado): no entra en el 111
      nomina({ rol: 'empleado', mes: 1, salarioBruto: 500_000, irpf: 15 }),
    ]

    const m111 = porModelo(generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas }), '111')

    expect(m111.datos.trabajoBruto).toBe(650_000) // 450.000 Ana + 200.000 Luis
    expect(m111.datos.trabajoRetenciones).toBe(87_500) // 67.500 + 20.000
    expect(m111.datos.profesionalBruto).toBe(7_000_000) // 3.000.000 López + 4.000.000 Otro (sin el T2)
    expect(m111.datos.profesionalRetenciones).toBe(1_050_000) // 15%
    expect(m111.datos.totalRetenciones).toBe(1_137_500)
    expect(m111.datos.numPerceptores).toBe(4) // Ana, Luis, Consultoría López, Otro Proveedor
  })

  it('no genera el 111 si no hay nóminas de empleador ni gastos', () => {
    const facturas = [factura({ fechaEmision: '2026-02-15', baseImponible: 1_000_000, iva: 21 })]
    const modelos = generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas: [] })
    expect(modelos.some(m => m.modelo === '111')).toBe(false)
  })
})

describe('generarModelosTrimestrales — fingerprints y regeneración', () => {
  it('genera exactamente los modelos del pack trimestral con datos', () => {
    const facturas = [
      factura({ fechaEmision: '2026-02-15', baseImponible: 1_000_000, iva: 21 }),
      factura({ fechaEmision: '2026-02-20', tipo: 'gasto', emisorReceptor: 'Consultoría López', baseImponible: 200_000, iva: 21 }),
    ]
    const modelos = generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas: [] })
    expect(modelos.map(m => m.modelo).sort()).toEqual([...MODELOS_TRIMESTRALES].sort())
  })

  it('la huella es estable con los mismos datos y cambia si cambia una factura', () => {
    const facturas = [factura({ fechaEmision: '2026-02-15', baseImponible: 1_000_000, iva: 21 })]
    const una = generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas: [] })
    const dos = generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas, nominas: [] })
    expect(una.map(m => m.fingerprint)).toEqual(dos.map(m => m.fingerprint))

    const cambiadas = [factura({ fechaEmision: '2026-02-15', baseImponible: 1_000_500, iva: 21 })]
    const tres = generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas: cambiadas, nominas: [] })
    expect(tres.find(m => m.modelo === '303')?.fingerprint).not.toBe(una.find(m => m.modelo === '303')?.fingerprint)
  })

  it('fingerprintModelo es determinista e ignora el orden de las claves', () => {
    const a = fingerprintModelo('303', 2026, 1, { x: 1, y: 2 })
    const b = fingerprintModelo('303', 2026, 1, { y: 2, x: 1 })
    const c = fingerprintModelo('303', 2026, 2, { x: 1, y: 2 })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('sin facturas ni nóminas no genera nada', () => {
    expect(generarModelosTrimestrales({ anyo: ANYO, trimestre: 1, facturas: [], nominas: [] })).toEqual([])
  })
})

describe('trimestreDeFecha', () => {
  it('mapea fechas a trimestres dentro del año consultado', () => {
    expect(trimestreDeFecha('2026-01-15', 2026)).toBe(1)
    expect(trimestreDeFecha('2026-04-15', 2026)).toBe(2)
    expect(trimestreDeFecha('2026-07-15', 2026)).toBe(3)
    expect(trimestreDeFecha('2026-12-15', 2026)).toBe(4)
    expect(trimestreDeFecha('2025-06-15', 2026)).toBeNull()
    expect(trimestreDeFecha('no-es-fecha', 2026)).toBeNull()
  })
})
