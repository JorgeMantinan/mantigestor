import type { OcrResult } from './ocr'

export interface CamposControladosOcr {
  tipo: string | null
  baseImponible: number | null
  iva: number | null
}

/**
 * Rellena por DOM solo los inputs NO controlados (numero, emisorReceptor, nif, fecha).
 * Devuelve los campos controlados (tipo, baseImponible, iva) para que el caller
 * los escriba con setState — escribir .value en inputs controlados por React
 * es revertido por el siguiente render.
 */
export function rellenarFormularioDesdeOcr(
  formRef: React.RefObject<HTMLFormElement | null>,
  data: OcrResult
): CamposControladosOcr {
  const campos: CamposControladosOcr = {
    tipo: data.tipo,
    baseImponible: data.baseImponible,
    iva: data.iva,
  }

  const f = formRef.current
  if (!f) return campos

  const setVal = (name: string, value: string) => {
    const el = f.elements.namedItem(name)
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.value = value
    }
  }

  if (data.numero) setVal('numero', data.numero)
  if (data.emisorReceptor) setVal('emisorReceptor', data.emisorReceptor)
  if (data.nifContraparte) setVal('nifContraparte', data.nifContraparte)
  if (data.fechaEmision) setVal('fechaEmision', data.fechaEmision)

  return campos
}
