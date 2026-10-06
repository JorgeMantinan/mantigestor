/**
 * Neutraliza la inyección de fórmulas en celdas CSV (CWE-1236).
 * - elimina saltos de línea (romperían filas)
 * - si empieza por = + - @ o tab, Excel/Sheets lo evaluaría como fórmula:
 *   se antepone una comilla simple (literal en Excel y LibreOffice)
 * - dobla las comillas dobles y envuelve la celda
 */
export function celdaCsv(valor: unknown): string {
  const texto = String(valor ?? '').replace(/[\r\n]+/g, ' ')
  const conPrefijo = /^[=+\-@\t]/.test(texto) ? `'${texto}` : texto
  return `"${conPrefijo.replace(/"/g, '""')}"`
}
