import type { OcrResult } from './ocr'

export function rellenarFormularioDesdeOcr(
  formRef: React.RefObject<HTMLFormElement | null>,
  data: OcrResult
): void {
  const f = formRef.current
  if (!f) return
  if (data.tipo) (f.elements.namedItem('tipo') as HTMLSelectElement).value = data.tipo
  if (data.numero) (f.elements.namedItem('numero') as HTMLInputElement).value = data.numero
  if (data.emisorReceptor) (f.elements.namedItem('emisorReceptor') as HTMLInputElement).value = data.emisorReceptor
  if (data.nifContraparte) (f.elements.namedItem('nifContraparte') as HTMLInputElement).value = data.nifContraparte
  if (data.fechaEmision) (f.elements.namedItem('fechaEmision') as HTMLInputElement).value = data.fechaEmision
  if (data.baseImponible !== null) (f.elements.namedItem('baseImponible') as HTMLInputElement).value = data.baseImponible.toString()
  if (data.iva !== null) (f.elements.namedItem('iva') as HTMLSelectElement).value = data.iva.toString()
}
