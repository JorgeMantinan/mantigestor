import { describe, it, expect } from 'vitest'
import { parsearExtracto } from '../importar-extracto'

const CSV_SANTANDER = `Banco Santander
Extracto de cuenta
IBAN: ES12345678901234567890
Periodo: Enero 2024
Saldo inicial: 3500,00
Fecha;Concepto;Importe;Saldo
15/01/2024;NOMINA EMPRESA SL;1500,00;5000,00
20/01/2024;TRANSFERENCIA BIZUM;-45,50;4954,50
01/02/2024;RECIBO LUZ IBERDROLA;-120,00;4834,50`

const CSV_BBVA = `Fecha;Hora;Concepto;Importe;Saldo
15/01/2024;10:30;NOMINA;1500,00;5000,00
20/01/2024;12:00;BIZUM PAGO;-45,50;4954,50`

const CSV_GENERICO = `Fecha;Concepto;Importe;Saldo
15/01/2024;NOMINA;1500,00;5000,00
20/01/2024;PAGO CLIENTE;-200,00;4800,00`

const CSV_COMAS = `Fecha,Concepto,Importe,Saldo
01/03/2024,ALQUILER,-800,00,4200,00`

describe('parsearExtracto', () => {
  it('parsea CSV Santander', () => {
    const r = parsearExtracto(CSV_SANTANDER, 'csv_santander')
    expect(r).toHaveLength(3)
    expect(r[0]!.concepto).toContain('NOMINA')
    expect(r[0]!.importe).toBe(150000)
    expect(r[1]!.importe).toBe(-4550)
    expect(r[2]!.importe).toBe(-12000)
  })

  it('parsea CSV BBVA', () => {
    const r = parsearExtracto(CSV_BBVA, 'csv_bbva')
    expect(r).toHaveLength(2)
    expect(r[0]!.concepto).toBe('NOMINA')
    expect(r[0]!.importe).toBe(150000)
  })

  it('parsea CSV genérico', () => {
    const r = parsearExtracto(CSV_GENERICO, 'generico')
    expect(r).toHaveLength(2)
    expect(r[0]!.concepto).toBe('NOMINA')
    expect(r[1]!.importe).toBe(-20000)
  })

  it('parsea CSV con comas', () => {
    const r = parsearExtracto(CSV_COMAS, 'generico')
    expect(r).toHaveLength(1)
    expect(r[0]!.concepto).toBe('ALQUILER')
    expect(r[0]!.importe).toBe(-80000)
  })

  it('filtra líneas vacías', () => {
    const csv = `Fecha;Concepto;Importe;Saldo\n15/01/2024;PAGO;100,00;5000,00\n\n`
    const r = parsearExtracto(csv, 'generico')
    expect(r).toHaveLength(1)
  })

  it('devuelve fechas válidas', () => {
    const r = parsearExtracto(CSV_SANTANDER, 'csv_santander')
    expect(r[0]!.fecha).toBeInstanceOf(Date)
    expect(Number.isNaN(r[0]!.fecha.getTime())).toBe(false)
  })

  it('devuelve saldo en céntimos', () => {
    const r = parsearExtracto(CSV_SANTANDER, 'csv_santander')
    expect(r[0]!.saldo).toBe(500000)
  })
})
