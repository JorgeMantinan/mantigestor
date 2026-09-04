'use client'

export function generarFacturaXML(factura: {
  numero: string
  fechaEmision: string
  emisorReceptor: string
  nifContraparte: string | null
  baseImponible: number
  iva: number
  total: number
  tipo: string
  notas?: string | null
}, perfil: {
  nombre?: string | null
  nif?: string | null
  direccion?: string | null
  email?: string | null
}): string {
  const base = factura.baseImponible / 100
  const ivaAmount = base * (factura.iva / 100)
  const total = factura.total / 100
  const tipoDoc = factura.tipo === 'ingreso' ? 'F' : 'R'

  return `<?xml version="1.0" encoding="UTF-8"?>
<Facturae xmlns="http://www.facturae.es/datatypes/fe/">
  <Cabecera>
    <Fecha>${factura.fechaEmision.slice(0, 10)}</Fecha>
    <Numero>${factura.numero}</Numero>
    <TipoDoc>${tipoDoc}</TipoDoc>
    <Emisor>
      <NIF>${perfil.nif ?? ''}</NIF>
      <NombreRazon>${perfil.nombre ?? ''}</NombreRazon>
      <Direccion>${perfil.direccion ?? ''}</Direccion>
      <Email>${perfil.email ?? ''}</Email>
    </Emisor>
    <Receptor>
      <NIF>${factura.nifContraparte ?? ''}</NIF>
      <NombreRazon>${factura.emisorReceptor}</NombreRazon>
    </Receptor>
  </Cabecera>
  <Cuerpo>
    <DetalleLinea>
      <Descripcion>${factura.notas ?? factura.emisorReceptor}</Descripcion>
      <ImporteUnitario>${base.toFixed(2)}</ImporteUnitario>
      <Cantidad>1</Cantidad>
      <ImporteTotal>${base.toFixed(2)}</ImporteTotal>
    </DetalleLinea>
  </Cuerpo>
  <Totales>
    <BaseImponible>${base.toFixed(2)}</BaseImponible>
    <TipoIVA>${factura.iva}</TipoIVA>
    <ImporteIVA>${ivaAmount.toFixed(2)}</ImporteIVA>
    <ImporteTotal>${total.toFixed(2)}</ImporteTotal>
  </Totales>
</Facturae>`
}

export function descargarFacturaXML(
  factura: Parameters<typeof generarFacturaXML>[0],
  perfil: Parameters<typeof generarFacturaXML>[1]
) {
  const xml = generarFacturaXML(factura, perfil)
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `factura-${factura.numero}.xml`
  a.click()
  URL.revokeObjectURL(url)
}
