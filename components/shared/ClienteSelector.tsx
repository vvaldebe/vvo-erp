'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'
import type { Cliente, Contacto } from '@/types/database.types'

export interface ClienteSelectorValue {
  cliente: Cliente
  contactos: Contacto[]
  selectedContactIds: string[]
}

interface Props {
  clientes: Cliente[]
  value?: string   // selected cliente id
  onChange?: (value: ClienteSelectorValue | null) => void
  onContactosChange?: (contactos: Contacto[], selectedIds: string[]) => void
  placeholder?: string
}

export default function ClienteSelector({
  clientes,
  value,
  onChange,
  onContactosChange,
  placeholder = 'Buscar cliente...',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [loadingContactos, setLoadingContactos] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedCliente = value ? clientes.find((c) => c.id === value) : undefined

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load contacts when cliente changes
  useEffect(() => {
    if (!value) {
      setContactos([])
      setSelectedContactIds([])
      return
    }
    setLoadingContactos(true)
    fetch(`/api/clientes/${value}/contactos`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: Contacto[]) => {
        setContactos(data)
        const principal = data.filter((c) => c.es_principal).map((c) => c.id)
        setSelectedContactIds(principal.length > 0 ? principal : data.slice(0, 1).map((c) => c.id))
        onContactosChange?.(data, principal.length > 0 ? principal : data.slice(0, 1).map((c) => c.id))
      })
      .catch(() => setContactos([]))
      .finally(() => setLoadingContactos(false))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(cliente: Cliente) {
    setOpen(false)
    setQuery('')
    onChange?.({ cliente, contactos: [], selectedContactIds: [] })
  }

  function handleClear() {
    onChange?.(null)
    setContactos([])
    setSelectedContactIds([])
  }

  function toggleContacto(id: string) {
    const next = selectedContactIds.includes(id)
      ? selectedContactIds.filter((c) => c !== id)
      : [...selectedContactIds, id]
    setSelectedContactIds(next)
    onContactosChange?.(contactos, next)
  }

  const filtered = clientes.filter((c) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    const displayName = c.razon_social ?? c.nombre
    return (
      displayName.toLowerCase().includes(q) ||
      (c.rut ?? '').toLowerCase().includes(q)
    )
  })

  const displayName = selectedCliente
    ? (selectedCliente.razon_social ?? selectedCliente.nombre)
    : null

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        {/* Trigger */}
        <div
          role="combobox"
          aria-expanded={open}
          className={[
            'flex items-center h-8 rounded-[6px] border bg-[var(--bg-input)] px-3 cursor-pointer transition-colors',
            open
              ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/10'
              : 'border-[var(--border-input)] hover:border-[var(--border-default)]',
          ].join(' ')}
          onClick={() => setOpen(!open)}
        >
          {displayName ? (
            <span className="flex-1 text-[13px] text-[var(--text-primary)] truncate">{displayName}</span>
          ) : (
            <span className="flex-1 text-[13px] text-[var(--text-muted)]">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {selectedCliente && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear() }}
                className="w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-[var(--border-subtle)]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-7 pl-7 pr-3 text-[12px] bg-[var(--bg-muted)] border border-[var(--border-input)] rounded-[5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-[12px] text-[var(--text-muted)]">Sin resultados</p>
              ) : (
                filtered.map((c) => {
                  const name = c.razon_social ?? c.nombre
                  const fantasy = c.nombre_fantasia && c.nombre_fantasia !== name ? c.nombre_fantasia : null
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={[
                        'w-full text-left px-3 py-2.5 transition-colors hover:bg-[var(--bg-muted)]',
                        c.id === value ? 'bg-[#7c3aed]/5' : '',
                      ].join(' ')}
                    >
                      <p className="text-[13px] font-medium text-[var(--text-primary)]">{name}</p>
                      {(fantasy || c.rut) && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {[fantasy, c.rut].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contact selector — shown when a client is selected and has contacts */}
      {selectedCliente && contactos.length > 0 && (
        <div className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2.5 space-y-2">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">Enviar a:</p>
          <div className="space-y-1.5">
            {contactos.map((c) => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedContactIds.includes(c.id)}
                  onChange={() => toggleContacto(c.id)}
                  className="w-3.5 h-3.5 rounded border-[var(--border-input)] accent-[#7c3aed]"
                />
                <span className="text-[12px] text-[var(--text-primary)]">{c.nombre}</span>
                {c.cargo && (
                  <span className="text-[11px] text-[var(--text-muted)]">· {c.cargo}</span>
                )}
                {c.es_principal && (
                  <span className="text-[10px] font-medium text-[#7c3aed]">Principal</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {loadingContactos && (
        <p className="text-[11px] text-[var(--text-muted)]">Cargando contactos...</p>
      )}
    </div>
  )
}
