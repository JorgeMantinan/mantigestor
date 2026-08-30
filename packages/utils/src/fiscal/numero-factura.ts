export function generarSiguienteNumeroFactura(numerosExistentes: string[]): string {
  const anyo = new Date().getFullYear()
  const prefijo = `F-${anyo}-`

  const numerosDelAnyo = numerosExistentes
    .filter(n => n.startsWith(prefijo))
    .map(n => {
      const parte = n.slice(prefijo.length)
      return parseInt(parte, 10)
    })
    .filter(n => !isNaN(n))

  const maximo = numerosDelAnyo.length > 0 ? Math.max(...numerosDelAnyo) : 0
  const siguiente = maximo + 1

  return `${prefijo}${String(siguiente).padStart(3, '0')}`
}

export function esNumeroFacturaValido(numero: string): boolean {
  return /^F-\d{4}-\d{3,}$/.test(numero)
}
