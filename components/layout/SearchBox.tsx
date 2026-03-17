'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, ClipboardList, Users } from 'lucide-react'

interface SearchResult {
  type: 'cotizacion' | 'ot' | 'cliente'
  id: string
  label: string
  sub: string
  href: string
  estado: string | null
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  cotizacion: 'Cotización',
  ot: 'OT',
  cliente: 'Cliente',
}

const TYPE_ICONS: Record<SearchResult['type'], React.ElementType> = {
  cotizacion: FileText,
  ot: ClipboardList,
  cliente: Users,
}

export default function SearchBox() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen]       = useState(false)
  const [active, setActive]   = useState(-1)
  const router    = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
    const data: SearchResult[] = await res.json()
    setResults(data)
    setOpen(data.length > 0)
    setActive(-1)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  function navigate(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((p) => Math.min(p + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((p) => Math.max(p - 1, -1)) }
    if (e.key === 'Enter' && active >= 0) navigate(results[active].href)
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  return (
    <div className="relative w-64">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar cotización, OT, cliente..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full h-8 pl-8 pr-3 text-[13px] bg-[var(--bg-muted)] border border-[var(--border-default)] rounded-[6px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors"
      />

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] shadow-lg z-50 overflow-hidden">
          {results.map((r, i) => {
            const Icon = TYPE_ICONS[r.type]
            return (
              <button
                key={r.id}
                type="button"
                onMouseDown={() => navigate(r.href)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  i === active ? 'bg-[#7c3aed]/10' : 'hover:bg-[var(--bg-muted)]',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{r.label}</p>
                  {r.sub && <p className="text-[11px] text-[var(--text-secondary)] truncate">{r.sub}</p>}
                </div>
                <span className="text-[10px] font-medium text-[var(--text-muted)] shrink-0">
                  {TYPE_LABELS[r.type]}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
