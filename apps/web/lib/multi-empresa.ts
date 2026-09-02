'use client'

export interface Empresa {
  id: string
  nombre: string
  nif: string
  direccion: string
  activa: boolean
}

const STORAGE_KEY = 'empresaActivaId'

export async function cargarEmpresas(): Promise<Empresa[]> {
  try {
    const res = await fetch('/api/fiscal/empresas')
    if (!res.ok) return []
    const data = await res.json()
    return (data.empresas ?? []) as Empresa[]
  } catch {
    return []
  }
}

export async function crearEmpresa(
  empresa: Omit<Empresa, 'id' | 'activa'>
): Promise<Empresa> {
  const res = await fetch('/api/fiscal/empresas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(empresa),
  })
  if (!res.ok) throw new Error('Error al crear empresa')
  const data = await res.json()
  return data.empresa as Empresa
}

export function seleccionarEmpresaLocal(empresaId: string | null): void {
  if (empresaId) {
    localStorage.setItem(STORAGE_KEY, empresaId)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function obtenerEmpresaSeleccionada(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}
