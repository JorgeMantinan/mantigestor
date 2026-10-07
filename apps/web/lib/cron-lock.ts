import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Lock distribuido (tabla cron_locks) para crons en Vercel: el Map in-memory
 * no protege entre lambdas. Caduca solo (p_segundos) para que un crash no
 * deje la clave bloqueada para siempre.
 *
 * Fail-open: si la RPC falla (permiso/BD), se permite ejecutar — el
 * UNIQUE(perfilId,numero) de facturas sigue siendo la última línea de defensa.
 */
export async function tomarLockCron(
  supabase: SupabaseClient,
  clave: string,
  segundos = 300
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('tomar_lock', {
      p_clave: clave,
      p_segundos: segundos,
    })
    if (error) {
      console.error(`[cron-lock] Error tomando lock ${clave}:`, error.message)
      return true
    }
    return data === true
  } catch (e) {
    console.error(`[cron-lock] Excepción tomando lock ${clave}:`, e)
    return true
  }
}

export async function liberarLockCron(supabase: SupabaseClient, clave: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('liberar_lock', { p_clave: clave })
    if (error) console.error(`[cron-lock] Error liberando lock ${clave}:`, error.message)
  } catch (e) {
    console.error(`[cron-lock] Excepción liberando lock ${clave}:`, e)
  }
}
