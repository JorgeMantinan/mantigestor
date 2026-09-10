export interface Modelo303Data {
  nif: string
  nombre: string
  ejercicio: number
  trimestre: 1 | 2 | 3 | 4
  base21: number
  base10: number
  base4: number
  base0: number
  iva21: number
  iva10: number
  iva4: number
  ivaTotal: number
  baseSoportada21: number
  baseSoportada10: number
  baseSoportada4: number
  ivaSoportado: number
  resultado: number
}

export interface Modelo111Data {
  nif: string
  nombre: string
  ejercicio: number
  trimestre: 1 | 2 | 3 | 4
  retencionesTrabajo: number
  retencionesActividades: number
  retencionesPredial: number
  totalRetenciones: number
}

export interface Modelo130Data {
  nif: string
  nombre: string
  ejercicio: number
  trimestre: 1 | 2 | 3 | 4
  ingresos: number
  gastos: number
  resultado: number
  pagosFraccionados: number
  totalADevolver: number
}

export interface Modelo100Data {
  nif: string
  nombre: string
  ejercicio: number
  baseImponible: number
  cuotaIntegra: number
  retenciones: number
  pagosFraccionados: number
  resultado: number
}

export interface ModeloExportResult {
  formato: string
  modelo: string
  datos: unknown
  archivos: Array<{ nombre: string; contenido: string; tipo: string }>
}

function centsToEuros(cents: number): number {
  return Math.round(cents) / 100
}

export function exportarModelo303(data: Modelo303Data): ModeloExportResult {
  const boeData = {
    "declaracion": {
      "modelo": "303",
      "ejercicio": data.ejercicio,
      "periodo": `T${data.trimestre}`,
      "nif": data.nif,
      "razonSocial": data.nombre,
      "devolucion": data.resultado < 0,
      "domiciliacion": false,
    },
    "casillas": {
      "01": centsToEuros(data.base21),
      "02": 21,
      "03": centsToEuros(data.iva21),
      "04": centsToEuros(data.base10),
      "05": 10,
      "06": centsToEuros(data.iva10),
      "07": centsToEuros(data.base4),
      "08": 4,
      "09": centsToEuros(data.iva4),
      "10": centsToEuros(data.base0),
      "28": centsToEuros(data.base21 + data.base10 + data.base4 + data.base0),
      "29": centsToEuros(data.iva21 + data.iva10 + data.iva4),
      "31": centsToEuros(data.baseSoportada21),
      "32": centsToEuros(data.baseSoportada10),
      "33": centsToEuros(data.baseSoportada4),
      "34": centsToEuros(data.ivaSoportado),
      "37": centsToEuros(Math.abs(data.resultado)),
    },
    "cuota_liquidacion": centsToEuros(Math.abs(data.resultado)),
    "a_favor_hacienda": data.resultado >= 0,
  }

  const json = JSON.stringify(boeData, null, 2)
  return {
    formato: 'BOE',
    modelo: '303',
    datos: boeData,
    archivos: [
      { nombre: `modelo-303-${data.ejercicio}-T${data.trimestre}.json`, contenido: json, tipo: 'application/json' },
    ],
  }
}

export function exportarModelo111(data: Modelo111Data): ModeloExportResult {
  const boeData = {
    "declaracion": {
      "modelo": "111",
      "ejercicio": data.ejercicio,
      "periodo": `T${data.trimestre}`,
      "nif": data.nif,
      "razonSocial": data.nombre,
    },
    "casillas": {
      "01": centsToEuros(data.retencionesTrabajo),
      "02": centsToEuros(data.retencionesActividades),
      "03": centsToEuros(data.retencionesPredial),
      "07": centsToEuros(data.totalRetenciones),
    },
    "cuota_liquidacion": centsToEuros(data.totalRetenciones),
  }

  const json = JSON.stringify(boeData, null, 2)
  return {
    formato: 'BOE',
    modelo: '111',
    datos: boeData,
    archivos: [
      { nombre: `modelo-111-${data.ejercicio}-T${data.trimestre}.json`, contenido: json, tipo: 'application/json' },
    ],
  }
}

export function exportarModelo130(data: Modelo130Data): ModeloExportResult {
  const boeData = {
    "declaracion": {
      "modelo": "130",
      "ejercicio": data.ejercicio,
      "periodo": `T${data.trimestre}`,
      "nif": data.nif,
      "razonSocial": data.nombre,
    },
    "casillas": {
      "01": centsToEuros(data.ingresos),
      "02": centsToEuros(data.gastos),
      "03": centsToEuros(data.resultado),
      "05": centsToEuros(data.pagosFraccionados),
      "06": centsToEuros(Math.abs(data.totalADevolver)),
    },
    "cuota_liquidacion": centsToEuros(Math.abs(data.totalADevolver)),
    "a_favor_hacienda": data.totalADevolver >= 0,
  }

  const json = JSON.stringify(boeData, null, 2)
  return {
    formato: 'BOE',
    modelo: '130',
    datos: boeData,
    archivos: [
      { nombre: `modelo-130-${data.ejercicio}-T${data.trimestre}.json`, contenido: json, tipo: 'application/json' },
    ],
  }
}

export function exportarModelo100(data: Modelo100Data): ModeloExportResult {
  const rentaWebData = {
    "declaracion": {
      "modelo": "100",
      "ejercicio": data.ejercicio,
      "tipo": "IRPF Renta Web",
      "nif": data.nif,
      "razonSocial": data.nombre,
    },
    "casillas": {
      "0480": centsToEuros(data.baseImponible),
      "0500": centsToEuros(data.cuotaIntegra),
      "0546": centsToEuros(data.pagosFraccionados),
      "0548": centsToEuros(data.retenciones),
      "0714": data.resultado < 0 ? centsToEuros(Math.abs(data.resultado)) : 0,
      "0716": data.resultado >= 0 ? centsToEuros(data.resultado) : 0,
    },
    "resultado_a_devolver": data.resultado < 0,
  }

  const json = JSON.stringify(rentaWebData, null, 2)
  return {
    formato: 'RentaWeb',
    modelo: '100',
    datos: rentaWebData,
    archivos: [
      { nombre: `renta-web-${data.ejercicio}-${data.nif}.json`, contenido: json, tipo: 'application/json' },
    ],
  }
}

export function generarArchivoImportacion(modelo: string, data: unknown): Blob {
  const contenido = JSON.stringify({
    formato: 'MantiGestor',
    modelo,
    version: '1.0',
    exportadoEn: new Date().toISOString(),
    datos: data,
  }, null, 2)
  return new Blob([contenido], { type: 'application/json' })
}

export function abrirSedeElectronica(modelo: string, nif: string, ejercicio: number): void {
  const URLs: Record<string, string> = {
    '303': 'https://sede.agenciatributaria.gob.es/static_files/formularios/303/index.html',
    '111': 'https://sede.agenciatributaria.gob.es/static_files/formularios/111/index.html',
    '130': 'https://sede.agenciatributaria.gob.es/static_files/formularios/130/index.html',
    '100': 'https://sede.agenciatributaria.gob.es/RentaWeb/',
  }

  const baseUrl = URLs[modelo]
  if (!baseUrl) {
    throw new Error(`Modelo ${modelo} no soportado para apertura en Sede Electrónica`)
  }

  const params = new URLSearchParams({
    nif,
    ejercicio: String(ejercicio),
  })

  window.open(`${baseUrl}?${params.toString()}`, '_blank')
}

export function descargarModelo(resultado: ModeloExportResult) {
  for (const archivo of resultado.archivos) {
    const blob = new Blob([archivo.contenido], { type: archivo.tipo })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = archivo.nombre
    a.click()
    URL.revokeObjectURL(url)
  }
}
