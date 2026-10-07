'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Receipt, Home, Users, ArrowRight, Clock, Trash2, LayoutDashboard } from 'lucide-react'

interface SearchResult {
  id: string
  titulo: string
  subtitulo: string
  href: string
  tipo: 'factura' | 'propiedad' | 'nomina' | 'pagina'
}

interface SearchPage {
  label: string
  href: string
  keywords: string[]
}

const PAGES: SearchPage[] = [
  { label: 'Dashboard', href: '/dashboard', keywords: ['panel', 'inicio', 'dashboard'] },
  { label: 'Facturas', href: '/gestoria/facturas', keywords: ['factura', 'recibo', 'invoice'] },
  { label: 'Nóminas', href: '/nominas', keywords: ['nomina', 'empleado', 'sueldo'] },
  { label: 'Alquiler', href: '/alquiler', keywords: ['alquiler', 'propiedad', 'inquilino'] },
  { label: 'Fiscal', href: '/fiscal', keywords: ['fiscal', 'modelo', 'iva', 'irpf'] },
  { label: 'Modelo 303', href: '/fiscal?seccion=modelo303', keywords: ['303', 'iva trimestral'] },
  { label: 'Modelo 130', href: '/fiscal?seccion=modelo130', keywords: ['130', 'pago fraccionado'] },
  { label: 'Modelo 111', href: '/fiscal?seccion=modelo111', keywords: ['111', 'retenciones'] },
  { label: 'Modelo 100', href: '/fiscal?seccion=modelo100', keywords: ['100', 'renta'] },
  { label: 'Documentos', href: '/gestoria/documentos', keywords: ['documento', 'archivo', 'pdf'] },
  { label: 'AI Assistant', href: '/ai', keywords: ['ia', 'asistente', 'chat', 'claude'] },
  { label: 'Conversiones', href: '/conversiones', keywords: ['convertir', 'divisa', 'moneda'] },
  { label: 'Ajustes', href: '/ajustes', keywords: ['configuracion', 'ajustes', 'settings'] },
  { label: 'Benchmarking', href: '/herramientas/benchmarking', keywords: ['benchmark', 'comparar'] },
  { label: 'Primer trimestre', href: '/herramientas/primer-trimestre', keywords: ['trimestre', 'primera vez'] },
  { label: 'Escanear ticket', href: '/herramientas/escanear-ticket', keywords: ['escanear', 'ticket', 'foto'] },
]

const ICONOS: Record<SearchResult['tipo'], React.ReactNode> = {
  factura: <Receipt className="h-4 w-4" aria-hidden="true" />,
  propiedad: <Home className="h-4 w-4" aria-hidden="true" />,
  nomina: <Users className="h-4 w-4" aria-hidden="true" />,
  pagina: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
}

const RECENT_KEY = 'mg-recent-searches'

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return
  const recent = getRecentSearches().filter(r => r !== query)
  recent.unshift(query)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)))
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(RECENT_KEY)
}

interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Escapar comodines ILIKE (\ % _) y neutralizar metacaracteres de
    // PostgREST (, ( )) que reescribirían la estructura del .or(...)
    const terminoSeguro = `%${q.replace(/[\\%_]/g, '\\$&').replace(/[,()]/g, ' ').trim()}%`
    const [facturas, propiedades, nominas] = await Promise.all([
      supabase
        .from('facturas')
        .select('id, numero, emisorReceptor, nifContraparte')
        .eq('perfilId', user.id)
        .or(
          `numero.ilike.${terminoSeguro},emisorReceptor.ilike.${terminoSeguro},nifContraparte.ilike.${terminoSeguro}`
        )
        .limit(5),
      supabase
        .from('propiedades_alquiler')
        .select('id, direccion, inquilinoNombre')
        .eq('perfilId', user.id)
        .or(`direccion.ilike.${terminoSeguro},inquilinoNombre.ilike.${terminoSeguro}`)
        .limit(5),
      supabase
        .from('nominas')
        .select('id, empleada, mes, anyo')
        .eq('perfilId', user.id)
        .ilike('empleada', terminoSeguro)
        .limit(5),
    ])

    const items: SearchResult[] = []

    // Pages match
    const lowerQ = q.toLowerCase()
    for (const page of PAGES) {
      if (
        page.label.toLowerCase().includes(lowerQ) ||
        page.keywords.some(k => k.includes(lowerQ))
      ) {
        items.push({
          id: `page-${page.href}`,
          titulo: page.label,
          subtitulo: page.href,
          href: page.href,
          tipo: 'pagina',
        })
      }
    }

    // DB results
    for (const f of facturas.data ?? [])
      items.push({
        id: f.id,
        titulo: `Factura ${f.numero}`,
        subtitulo: f.emisorReceptor,
        href: `/gestoria/facturas/${f.id}`,
        tipo: 'factura',
      })
    for (const p of propiedades.data ?? [])
      items.push({
        id: p.id,
        titulo: p.direccion,
        subtitulo: p.inquilinoNombre ?? 'Sin inquilino',
        href: '/alquiler',
        tipo: 'propiedad',
      })
    for (const n of nominas.data ?? [])
      items.push({
        id: n.id,
        titulo: n.empleada,
        subtitulo: `${n.mes}/${n.anyo}`,
        href: '/nominas',
        tipo: 'nomina',
      })

    setResults(items)
    setSelectedIndex(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) void search(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      saveRecentSearch(query)
      router.push(results[selectedIndex].href)
      onOpenChange(false)
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  function navigateTo(href: string) {
    if (query.trim()) saveRecentSearch(query)
    router.push(href)
    onOpenChange(false)
  }

  const groupedResults = results.reduce(
    (acc, r) => {
      const typeLabel =
        r.tipo === 'pagina'
          ? 'Páginas'
          : r.tipo === 'factura'
            ? 'Facturas'
            : r.tipo === 'propiedad'
              ? 'Propiedades'
              : 'Nóminas'
      if (!acc[typeLabel]) acc[typeLabel] = []
      acc[typeLabel].push(r)
      return acc
    },
    {} as Record<string, SearchResult[]>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" aria-label="Búsqueda global">
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground mr-2" aria-hidden="true" />
          <Input
            ref={inputRef}
            placeholder="Buscar páginas, facturas, nóminas..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Buscando...
            </p>
          )}

          {/* Recent searches */}
          {!loading && query.length < 2 && recentSearches.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-2 mb-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Recientes
                </p>
                <button
                  onClick={() => {
                    clearRecentSearches()
                    setRecentSearches([])
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Limpiar
                </button>
              </div>
              {recentSearches.map(r => (
                <button
                  key={r}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                  onClick={() => {
                    setQuery(r)
                    void search(r)
                  }}
                >
                  <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>{r}</span>
                </button>
              ))}
            </div>
          )}

          {/* Grouped results */}
          {!loading && Object.keys(groupedResults).length > 0 && (
            <>
              {Object.entries(groupedResults).map(([typeLabel, items]) => (
                <div key={typeLabel} className="mb-2">
                  <p className="px-2 mb-1 text-xs font-medium text-muted-foreground uppercase">
                    {typeLabel}
                  </p>
                  {items.map((r, _i) => {
                    const globalIdx = results.indexOf(r)
                    return (
                      <button
                        key={`${r.tipo}-${r.id}`}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
                          globalIdx === selectedIndex
                            ? 'bg-accent'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => navigateTo(r.href)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <span className="text-muted-foreground">
                          {ICONOS[r.tipo]}
                        </span>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{r.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.subtitulo}
                          </p>
                        </div>
                        <ArrowRight
                          className="h-3 w-3 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>
                    )
                  })}
                </div>
              ))}
            </>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin resultados para &quot;{query}&quot;
            </p>
          )}

          {!loading && query.length < 2 && recentSearches.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <p>Escribe para buscar páginas, facturas y más</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
