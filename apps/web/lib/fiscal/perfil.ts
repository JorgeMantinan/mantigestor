export type PerfilFiscal = 'autonomo' | 'sociedad' | 'empleado' | 'alquilador'

export function leerPerfil(): PerfilFiscal | null {
  if (typeof window === 'undefined') return null
  const p = window.localStorage.getItem('perfil-fiscal')
  return p === 'autonomo' || p === 'sociedad' || p === 'empleado' || p === 'alquilador' ? p : null
}

/** Guarda el perfil fiscal en BD (multi-dispositivo). Fallo silencioso: localStorage ya lo conserva. */
export async function guardarPerfilBd(cuerpo: { comunidadFiscal?: string; perfilFiscal?: PerfilFiscal }): Promise<void> {
  try {
    await fetch('/api/fiscal/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    // sin conexión o sin sesión: se mantiene la preferencia local
  }
}
