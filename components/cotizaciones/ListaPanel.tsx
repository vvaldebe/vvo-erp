'use client'

import React, { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import EstadoBadge from '@/components/shared/EstadoBadge'
import {
  fetchCotizacionesPage,
  bulkCambiarEstadoCotizaciones,
  bulkEliminarCotizaciones,
  buscarCotizaciones,
  type CotizacionListRow,
} from '@/app/actions/cotizaciones'

type EstadoCotizacion = 'borrador' | 'enviada' | 'aprobada' | 'rechazada'
type FiltroEstado = 'todos' | EstadoCotizacion

export interface CotizacionRow {
  id: string
  numero: string
  estado: EstadoCotizacion
  total: number
  created_at: string
  cliente_nombre: string
}

function formatFecha(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0,
  }).format(amount)
}

const TABS: { value: FiltroEstado; label: string }[] = [
  { value: 'todos',     label: 'Todas' },
  { value: 'borrador',  label: 'Borrador' },
  { value: 'enviada',   label: 'Enviada' },
  { value: 'aprobada',  label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
]

// ── Row component (memoized) ────────────────────────────────────────────────

interface RowProps {
  cot: CotizacionRow
  isSelected: boolean
  isChecked: boolean
  hasDetail: boolean
  onSelect: (id: string) => void
  onCheck: (id: string, checked: boolean) => void
}

const CotizacionRowItem = React.memo(function CotizacionRowItem({
  cot,
  isSelected,
  isChecked,
  hasDetail,
  onSelect,
  onCheck,
}: RowProps) {
  return (
    <div
      className={[
        'flex items-start w-full border-b border-[var(--border-subtle)] transition-colors',
        isSelected
          ? 'bg-[#7c3aed]/[0.08] border-l-2 border-l-[#7c3aed]'
          : 'hover:bg-[var(--bg-muted)] border-l-2 border-l-transparent',
      ].join(' ')}
    >
      {/* Checkbox */}
      <label
        className="flex items-center justify-center w-10 shrink-0 self-stretch cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onCheck(cot.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-[#7c3aed] cursor-pointer"
        />
      </label>

      {/* Content */}
      {hasDetail ? (
        /* Compact layout when detail panel is open */
        <button
          type="button"
          onClick={() => onSelect(cot.id)}
          className="flex-1 min-w-0 text-left px-2 py-3 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{cot.numero}</span>
            <EstadoBadge estado={cot.estado} />
          </div>
          <p className="text-[12px] text-[var(--text-secondary)] truncate">{cot.cliente_nombre}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-[var(--text-muted)]">{formatFecha(cot.created_at)}</span>
            <span className="text-[12px] font-medium text-[var(--text-primary)] tabular-nums">{formatCLP(cot.total)}</span>
          </div>
        </button>
      ) : (
        /* Full-width table layout when no detail selected */
        <button
          type="button"
          onClick={() => onSelect(cot.id)}
          className="flex-1 min-w-0 flex items-center gap-0 text-left cursor-pointer py-3 pr-3"
        >
          {/* Fecha: 100px */}
          <span className="w-[100px] shrink-0 text-[12px] text-[var(--text-muted)] tabular-nums">
            {formatFecha(cot.created_at)}
          </span>
          {/* N° cotización: 130px */}
          <span className="w-[130px] shrink-0 text-[13px] font-semibold text-[var(--text-primary)]">
            {cot.numero}
          </span>
          {/* Cliente: flex-1 */}
          <span className="flex-1 min-w-0 text-[13px] text-[var(--text-secondary)] truncate pr-2">
            {cot.cliente_nombre}
          </span>
          {/* Estado: 120px */}
          <span className="w-[120px] shrink-0">
            <EstadoBadge estado={cot.estado} />
          </span>
          {/* Total: 130px */}
          <span className="w-[130px] shrink-0 text-right text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
            {formatCLP(cot.total)}
          </span>
          {/* Acciones placeholder: 80px */}
          <span className="w-20 shrink-0" />
        </button>
      )}
    </div>
  )
})

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  cotizaciones: CotizacionRow[]
  hasMore?: boolean
}

export default function ListaPanel({ cotizaciones: initialCotizaciones, hasMore: initialHasMore = false }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const selectedId   = searchParams.get('id')
  const hasDetail    = Boolean(selectedId)

  const [query, setQuery]               = useState('')
  const [estado, setEstado]             = useState<FiltroEstado>('todos')
  const [rows, setRows]                 = useState<CotizacionRow[]>(initialCotizaciones)
  const [hasMore, setHasMore]           = useState(initialHasMore)
  const [isLoadingMore, startLoadMore]  = useTransition()
  const [isBulkPending, startBulk]      = useTransition()
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())

  // ── Search state (Bug 2) ──────────────────────────────────────────────────
  const [searchRows, setSearchRows]     = useState<CotizacionListRow[] | null>(null)
  const [isSearching, setIsSearching]   = useState(false)
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const isLoadingRef = useRef(false)

  // ── Debounced search (Bug 2) ──────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query.trim()
    if (!q) {
      setSearchRows(null)
      setIsSearching(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await buscarCotizaciones(q)
        setSearchRows(results)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // ── Derived display rows ──────────────────────────────────────────────────

  const displayRows = searchRows !== null ? searchRows : rows

  const conteos: Record<FiltroEstado, number> = {
    todos:     rows.length,
    borrador:  rows.filter((c) => c.estado === 'borrador').length,
    enviada:   rows.filter((c) => c.estado === 'enviada').length,
    aprobada:  rows.filter((c) => c.estado === 'aprobada').length,
    rechazada: rows.filter((c) => c.estado === 'rechazada').length,
  }

  const filtradas = displayRows.filter((c) => {
    if (estado !== 'todos' && c.estado !== estado) return false
    // When searching via server, skip client-side text filter (already filtered)
    if (searchRows !== null) return true
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return c.numero.toLowerCase().includes(q) || c.cliente_nombre.toLowerCase().includes(q)
  })

  // ── Infinite scroll (Bug 3: rootMargin for early preload) ─────────────────

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || !hasMore) return
    isLoadingRef.current = true
    startLoadMore(async () => {
      const { rows: newRows, hasMore: newHasMore } = await fetchCotizacionesPage(rows.length)
      setRows((prev) => {
        const existingIds = new Set(prev.map((r) => r.id))
        const deduped = newRows.filter((r) => !existingIds.has(r.id))
        return [...prev, ...deduped]
      })
      setHasMore(newHasMore)
      isLoadingRef.current = false
    })
  }, [hasMore, rows.length, startLoadMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { threshold: 0, rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  // ── Selection helpers ────────────────────────────────────────────────────

  function select(id: string) {
    router.push(`/cotizaciones?id=${id}`, { scroll: false })
  }

  function handleCheck(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const visibleIds = filtradas.map((c) => c.id)
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someChecked = !allChecked && visibleIds.some((id) => selectedIds.has(id))

  function handleHeaderCheck(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) visibleIds.forEach((id) => next.add(id))
      else visibleIds.forEach((id) => next.delete(id))
      return next
    })
  }

  // ── Bulk action handlers (Bug 1: optimistic updates) ─────────────────────

  function handleBulkEstado(newEstado: 'enviada' | 'aprobada' | 'rechazada') {
    const ids = Array.from(selectedIds)
    startBulk(async () => {
      const result = await bulkCambiarEstadoCotizaciones(ids, newEstado)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`${result.count} cotización${result.count !== 1 ? 'es' : ''} marcada${result.count !== 1 ? 's' : ''} como ${newEstado}`)
        // Optimistic update: update rows locally without router.refresh()
        setRows((prev) => prev.map((row) =>
          selectedIds.has(row.id) ? { ...row, estado: newEstado } : row,
        ))
        if (searchRows !== null) {
          setSearchRows((prev) => prev === null ? null : prev.map((row) =>
            selectedIds.has(row.id) ? { ...row, estado: newEstado } : row,
          ))
        }
        setSelectedIds(new Set())
      }
    })
  }

  function handleBulkEliminar() {
    const ids = Array.from(selectedIds)
    if (!window.confirm(`¿Eliminar ${ids.length} cotización${ids.length !== 1 ? 'es' : ''}? Solo se eliminarán las que estén en borrador o rechazada.`)) return
    startBulk(async () => {
      const result = await bulkEliminarCotizaciones(ids)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`${result.count} cotización${result.count !== 1 ? 'es' : ''} eliminada${result.count !== 1 ? 's' : ''}`)
        // Optimistic update: remove deleted rows locally without router.refresh()
        setRows((prev) => prev.filter((row) => !selectedIds.has(row.id)))
        if (searchRows !== null) {
          setSearchRows((prev) => prev === null ? null : prev.filter((row) => !selectedIds.has(row.id)))
        }
        setSelectedIds(new Set())
      }
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const isInSearchMode = searchRows !== null

  return (
    <div className="flex flex-col h-full border-r border-[var(--border-default)] bg-[var(--bg-card)]">

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 pt-3 pb-2 border-b border-[var(--border-default)] overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = estado === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setEstado(tab.value)}
              className={[
                'h-7 px-2.5 text-[12px] font-medium rounded-[5px] transition-colors cursor-pointer whitespace-nowrap shrink-0',
                isActive
                  ? 'bg-[var(--bg-muted)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]',
              ].join(' ')}
            >
              {tab.label}
              {conteos[tab.value] > 0 && (
                <span className={`ml-1 text-[11px] ${isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                  {conteos[tab.value]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[var(--border-default)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 h-7 text-[12px] bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/20 transition-colors"
          />
        </div>
        {/* Search status label */}
        {isSearching && (
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Buscando...</p>
        )}
        {!isSearching && isInSearchMode && (
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''} para &ldquo;{query.trim()}&rdquo;
          </p>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border-default)] bg-[var(--bg-card)] flex-wrap">
          <span className="text-[12px] font-medium text-[var(--text-primary)] shrink-0 mr-1">
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            disabled={isBulkPending}
            onClick={() => handleBulkEstado('enviada')}
            className="h-6 px-2 text-[11px] font-medium rounded-[4px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Enviadas
          </button>
          <button
            type="button"
            disabled={isBulkPending}
            onClick={() => handleBulkEstado('aprobada')}
            className="h-6 px-2 text-[11px] font-medium rounded-[4px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Aprobadas
          </button>
          <button
            type="button"
            disabled={isBulkPending}
            onClick={() => handleBulkEstado('rechazada')}
            className="h-6 px-2 text-[11px] font-medium rounded-[4px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Rechazadas
          </button>
          <button
            type="button"
            disabled={isBulkPending}
            onClick={handleBulkEliminar}
            className="h-6 px-2 text-[11px] font-medium rounded-[4px] border border-[var(--border-default)] text-red-400 hover:text-red-300 hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto flex items-center justify-center w-6 h-6 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            title="Deseleccionar todo"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* List */}
      <div className={[
        'flex-1 overflow-y-auto',
        !hasDetail ? 'flex flex-col' : '',
      ].join(' ')}>
        {!hasDetail && (
          /* Full-width: centered max-width container with table header */
          <div className="w-full max-w-[1200px] mx-auto">
            {/* Table header row */}
            <div className="flex items-center border-b border-[var(--border-default)] bg-[var(--bg-muted)] sticky top-0 z-10">
              {/* Checkbox: 40px */}
              <div className="w-10 shrink-0 flex items-center justify-center py-2">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked
                  }}
                  onChange={(e) => handleHeaderCheck(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[#7c3aed] cursor-pointer"
                />
              </div>
              {/* Fecha: 100px */}
              <span className="w-[100px] shrink-0 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide py-2">Fecha</span>
              {/* N° cotización: 130px */}
              <span className="w-[130px] shrink-0 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide py-2">N° Cot.</span>
              {/* Cliente: flex-1 */}
              <span className="flex-1 min-w-0 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide py-2 pr-2">Cliente</span>
              {/* Estado: 120px */}
              <span className="w-[120px] shrink-0 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide py-2">Estado</span>
              {/* Total: 130px */}
              <span className="w-[130px] shrink-0 text-right text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide py-2">Total</span>
              {/* Acciones: 80px */}
              <span className="w-20 shrink-0 py-2" />
            </div>

            {filtradas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-[var(--text-muted)]">
                <FileText className="w-7 h-7 opacity-25" />
                <p className="text-[13px]">Sin resultados</p>
              </div>
            ) : (
              filtradas.map((cot) => (
                <CotizacionRowItem
                  key={cot.id}
                  cot={cot}
                  isSelected={cot.id === selectedId}
                  isChecked={selectedIds.has(cot.id)}
                  hasDetail={false}
                  onSelect={select}
                  onCheck={handleCheck}
                />
              ))
            )}
          </div>
        )}

        {hasDetail && (
          filtradas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-[var(--text-muted)]">
              <FileText className="w-7 h-7 opacity-25" />
              <p className="text-[13px]">Sin resultados</p>
            </div>
          ) : (
            filtradas.map((cot) => (
              <CotizacionRowItem
                key={cot.id}
                cot={cot}
                isSelected={cot.id === selectedId}
                isChecked={selectedIds.has(cot.id)}
                hasDetail={true}
                onSelect={select}
                onCheck={handleCheck}
              />
            ))
          )
        )}

        {/* Infinite scroll sentinel — hidden when searching (Bug 2) */}
        {hasMore && !isInSearchMode && estado === 'todos' && (
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {isLoadingMore && (
              <svg className="h-4 w-4 animate-spin text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
