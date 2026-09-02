'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  type Empresa,
  cargarEmpresas,
  crearEmpresa as crearEmpresaLib,
  seleccionarEmpresaLocal,
  obtenerEmpresaSeleccionada,
} from '@/lib/multi-empresa'

interface EmpresaActivaState {
  empresaActiva: Empresa | null
  empresas: Empresa[]
  cargando: boolean
  seleccionarEmpresa: (empresaId: string | null) => void
  crearEmpresa: (empresa: Omit<Empresa, 'id' | 'activa'>) => Promise<Empresa>
}

const EmpresaActivaContext = createContext<EmpresaActivaState>({
  empresaActiva: null,
  empresas: [],
  cargando: true,
  seleccionarEmpresa: () => {},
  crearEmpresa: async () => ({ id: '', nombre: '', nif: '', direccion: '', activa: true }),
})

export function EmpresaActivaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaActivaId, setEmpresaActivaId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!user) {
      setEmpresas([])
      setEmpresaActivaId(null)
      setCargando(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const data = await cargarEmpresas()
        if (cancelled) return
        setEmpresas(data)

        const savedId = obtenerEmpresaSeleccionada()
        if (savedId && data.some(e => e.id === savedId)) {
          setEmpresaActivaId(savedId)
        } else if (data.length > 0) {
          const first = data[0]
          if (first) {
            setEmpresaActivaId(first.id)
            seleccionarEmpresaLocal(first.id)
          }
        } else {
          setEmpresaActivaId(null)
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setCargando(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  const seleccionarEmpresa = useCallback((empresaId: string | null) => {
    setEmpresaActivaId(empresaId)
    seleccionarEmpresaLocal(empresaId)
  }, [])

  const crearEmpresa = useCallback(async (data: Omit<Empresa, 'id' | 'activa'>) => {
    const nueva = await crearEmpresaLib(data)
    setEmpresas(prev => [...prev, nueva])
    setEmpresaActivaId(nueva.id)
    seleccionarEmpresaLocal(nueva.id)
    return nueva
  }, [])

  const empresaActiva = empresas.find(e => e.id === empresaActivaId) ?? null

  return (
    <EmpresaActivaContext.Provider
      value={{ empresaActiva, empresas, cargando, seleccionarEmpresa, crearEmpresa }}
    >
      {children}
    </EmpresaActivaContext.Provider>
  )
}

export function useEmpresaActiva() {
  return useContext(EmpresaActivaContext)
}
