/**
 * Ejecuta `tarea` sobre `items` con un máximo de `limite` en paralelo.
 * Usado por los crons para no hacer N round-trips secuenciales por usuario
 * (con1000 usuarios eran5000 llamadas encadenadas → riesgo de timeout).
 */
export async function mapConcurrente<T, R>(
  items: readonly T[],
  limite: number,
  tarea: (item: T, indice: number) => Promise<R>
): Promise<R[]> {
  const resultados = new Array<R>(items.length)
  let siguiente = 0
  const trabajadores = Array.from(
    { length: Math.max(1, Math.min(limite, items.length)) },
    async () => {
      while (siguiente < items.length) {
        const i = siguiente++
        resultados[i] = await tarea(items[i] as T, i)
      }
    }
  )
  await Promise.all(trabajadores)
  return resultados
}
