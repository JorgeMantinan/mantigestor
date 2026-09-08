'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Receipt, Home, Users, FileText, Calculator, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface SearchResult {
  id: string
  titulo: string
  subtitulo: string
  href: string
  tipo: 'factura' | 'propiedad' | 'nomina'
}

const ICONOS: Record<SearchResult['tipo'], React.ReactNode> = {
  factura: <Receipt className="h-4 w-4" aria-hidden="true" />,
  propiedad: <Home className="h-4 w-4" aria-hidden="true" />,
  nomina: <Users className="h-4 w-4" aria-hidden="true" />,
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { t } = useLanguage()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const term = `%${q}%`
    const [facturas, propiedades, nominas] = await Promise.all([
      supabase.from('facturas').select('id, numero, emisorReceptor, nifContraparte').eq('perfilId', user.id).or(`numero.ilike.${term},emisorReceptor.ilike.${term},nifContraparte.ilike.${term}`).limit(5),
      supabase.from('propiedades_alquiler').select('id, direccion, inquilinoNombre').eq('perfilId', user.id).or(`direccion.ilike.${term},inquilinoNombre.ilike.${term}`).limit(5),
      supabase.from('nominas').select('id, empleada, mes, anyo').eq('perfilId', user.id).ilike('empleada', term).limit(5),
    ])

    const items: SearchResult[] = []
    for (const f of facturas.data ?? []) items.push({ id: f.id, titulo: `Factura ${f.numero}`, subtitulo: f.emisorReceptor, href: `/gestoria/facturas/${f.id}`, tipo: 'factura' })
    for (const p of propiedades.data ?? []) items.push({ id: p.id, titulo: p.direccion, subtitulo: p.inquilinoNombre ?? t('commandPalette.sinInquilino'), href: '/alquiler', tipo: 'propiedad' })
    for (const n of nominas.data ?? []) items.push({ id: n.id, titulo: n.empleada, subtitulo: `${n.mes}/${n.anyo}`, href: '/nominas', tipo: 'nomina' })

    setResults(items)
    setSelectedIndex(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const timer = setTimeout(() => { if (query) void search(query) }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[selectedIndex]) {
      router.push(results[selectedIndex].href)
      setOpen(false)
    }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0" aria-label={t('commandPalette.busquedaGlobal')}>
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground mr-2" aria-hidden="true" />
          <Input
            ref={inputRef}
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && <p className="text-sm text-muted-foreground text-center py-4">{t('commandPalette.buscando')}</p>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('commandPalette.sinResultados')} &quot;{query}&quot;</p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.tipo}-${r.id}`}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${i === selectedIndex ? 'bg-accent' : 'hover:bg-muted/50'}`}
              onClick={() => { router.push(r.href); setOpen(false) }}
            >
              <span className="text-muted-foreground">{ICONOS[r.tipo]}</span>
              <div className="flex-1 text-left">
                <p className="font-medium">{r.titulo}</p>
                <p className="text-xs text-muted-foreground">{r.subtitulo}</p>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
          {!loading && query.length < 2 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <p>{t('commandPalette.escribeMinimo')}</p>
              <p className="text-xs mt-1">{t('commandPalette.atajoTeclado')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
