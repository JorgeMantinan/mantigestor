import { describe, it, expect } from 'vitest'
import { calcularNomina, calcularFiniquito } from '../nomina'

describe('calcularNomina', () => {
  it('calcula nómina básica correctamente', () => {
    const resultado = calcularNomina({ salarioBrutoMensual: 1500 })

    expect(resultado.salarioBrutoMensual).toBe(1500)
    expect(resultado.tipoIRPF).toBeGreaterThan(0)
    expect(resultado.seguridadSocial).toBeGreaterThan(0)
    expect(resultado.salarioNetoMensual).toBeLessThan(1500)
    expect(resultado.salarioNetoMensual).toBeGreaterThan(0)
  })

  it('calcula IRPF más alto con más salario', () => {
    const basica = calcularNomina({ salarioBrutoMensual: 1500 })
    const alta = calcularNomina({ salarioBrutoMensual: 5000 })

    expect(alta.tipoIRPF).toBeGreaterThan(basica.tipoIRPF)
  })

  it('calcula IRPF más bajo con hijos', () => {
    const sinHijos = calcularNomina({ salarioBrutoMensual: 3000 })
    const conHijos = calcularNomina({ salarioBrutoMensual: 3000, hijos: 2 })

    expect(conHijos.tipoIRPF).toBeLessThanOrEqual(sinHijos.tipoIRPF)
  })

  it('incluye pagas extra en el cálculo anual', () => {
    const sinExtra = calcularNomina({ salarioBrutoMensual: 2000, pagasExtra: 0 })
    const conExtra = calcularNomina({ salarioBrutoMensual: 2000, pagasExtra: 2 })

    expect(conExtra.pagaExtraBruto).toBe(2000)
    expect(conExtra.salarioNetoAnual).toBeGreaterThan(sinExtra.salarioNetoAnual)
  })

  it('calcula desglose anual coherente', () => {
    const r = calcularNomina({ salarioBrutoMensual: 2000 })

    expect(r.desglose.brutoAnual).toBe(24000)
    expect(r.desglose.ssAnual).toBeGreaterThan(0)
    expect(r.desglose.irpfAnual).toBeGreaterThan(0)
    expect(r.desglose.netoAnual).toBe(r.desglose.brutoAnual - r.desglose.ssAnual - r.desglose.irpfAnual)
  })
})

describe('calcularFiniquito', () => {
  it('calcula finiquito correctamente', () => {
    const resultado = calcularFiniquito({
      salarioBrutoMensual: 1500,
      diasTrabajadosMes: 15,
      diasVacacionesPendientes: 10,
      pagasExtraPendientes: 0.5,
      tipoIRPF: 15,
    })

    expect(resultado.parteProporcional).toBe(750) // 1500/30*15
    expect(resultado.vacacionesPendientes).toBe(500) // 1500/30*10
    expect(resultado.pagasExtraPendientes).toBe(750) // 1500*0.5
    expect(resultado.brutoTotal).toBe(2000)
    expect(resultado.irpf).toBe(300) // 2000*15%
    expect(resultado.neto).toBe(1700)
  })

  it('finiquito sin vacaciones ni pagas extra', () => {
    const resultado = calcularFiniquito({
      salarioBrutoMensual: 2000,
      diasTrabajadosMes: 20,
      diasVacacionesPendientes: 0,
      pagasExtraPendientes: 0,
      tipoIRPF: 0,
    })

    expect(resultado.brutoTotal).toBe(Math.round(2000 / 30 * 20 * 100) / 100)
    expect(resultado.irpf).toBe(0)
    expect(resultado.neto).toBe(resultado.brutoTotal)
  })
})
