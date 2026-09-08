'use client'

export {
  type BancoId,
  type BancoInfo,
  type LineaExtracto,
  type LineaFactura,
  type Coincidencia,
  BANCOS,
  detectarBanco,
  parsearExtractoCSV,
  parsearLineaCSV,
  parsearImporte,
  normalizarFecha,
  diasEntre,
  calcularSimilitud,
  encontrarCoincidencias,
} from '@mantigestor/utils'
