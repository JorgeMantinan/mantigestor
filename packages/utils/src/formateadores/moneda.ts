export function formatearEuro(centimos: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(centimos / 100)
}

export function centimosAEuros(centimos: number): number {
  return centimos / 100
}

export function eurosACentimos(euros: number): number {
  return Math.round(euros * 100)
}
