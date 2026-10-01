import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { extraerTextoImagen, parseTextoTicket } from '@/lib/ocr'

// E2E del OCR real (tesseract + preprocesado con sharp). Descarga el idioma a la
// primera ejecución, por eso solo corre con OCR_E2E=1 (timeout amplio).
const RUN = !!process.env.OCR_E2E

const TICKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420">
<rect width="700" height="420" fill="white"/>
<text x="40" y="60" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="black">TIENDA EJEMPLO S.L.</text>
<text x="40" y="105" font-family="Arial, sans-serif" font-size="26" fill="black">NIF: B12345678</text>
<text x="40" y="150" font-family="Arial, sans-serif" font-size="26" fill="black">Fecha: 15/03/2026</text>
<text x="40" y="210" font-family="Arial, sans-serif" font-size="26" fill="black">Pan batido          1,20</text>
<text x="40" y="255" font-family="Arial, sans-serif" font-size="26" fill="black">Cafe con leche      1,80</text>
<text x="40" y="320" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="black">TOTAL: 3,00</text>
<text x="40" y="370" font-family="Arial, sans-serif" font-size="26" fill="black">IVA 21% 0,52</text>
</svg>`

describe.runIf(RUN)('OCR real con tesseract.js (OCR_E2E=1)', () => {
  it('lee un ticket sintético renderizado y parsea los campos', async () => {
    const png = await sharp(Buffer.from(TICKET_SVG)).png().toBuffer()
    const texto = await extraerTextoImagen(`data:image/png;base64,${png.toString('base64')}`)

    // El OCR debe haber reconocido al menos partes del ticket
    expect(texto.replace(/\s/g, '').length).toBeGreaterThan(20)

    const r = parseTextoTicket(texto)
    expect(r.total).not.toBeNull()
    expect(r.total as number).toBeCloseTo(3, 1)
    expect(r.iva).toBe(21)
    expect(r.nifContraparte).toBe('B12345678')
    expect(r.fechaEmision).toBe('2026-03-15')
    expect(r.emisorReceptor).toContain('TIENDA')
  }, 180_000)
})
