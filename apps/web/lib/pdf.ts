'use client'

/**
 * Genera un PDF a partir de un elemento HTML.
 * @param element - El elemento DOM a capturar
 * @param filename - Nombre del archivo (sin extensión)
 * @param options - Opciones adicionales
 */
export async function generarPDF(
  element: HTMLElement,
  filename: string,
  options?: { orientacion?: 'portrait' | 'landscape'; formato?: 'a4' | 'letter' }
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: options?.orientacion ?? 'portrait',
    unit: 'mm',
    format: options?.formato ?? 'a4',
  })

  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = canvas.width
  const imgHeight = canvas.height
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
  const imgX = (pdfWidth - imgWidth * ratio) / 2
  const imgY = 0

  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
  pdf.save(`${filename}.pdf`)
}

/**
 * Genera un PDF a partir de contenido HTML directo (sin elemento DOM).
 */
export async function generarPDFDeHTML(
  html: string,
  filename: string,
  options?: { orientacion?: 'portrait' | 'landscape' }
): Promise<void> {
  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '210mm'
  container.style.padding = '20mm'
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif'
  container.style.fontSize = '12px'
  container.style.lineHeight = '1.5'
  container.style.color = '#1a1a1a'
  container.style.background = '#ffffff'
  document.body.appendChild(container)

  try {
    await generarPDF(container, filename, options)
  } finally {
    document.body.removeChild(container)
  }
}
