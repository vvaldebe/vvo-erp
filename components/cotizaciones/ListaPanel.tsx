'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, FileText } from 'lucide-react'
import EstadoBadge from '@/components/shared/EstadoBadge'

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

interface Props {
  cotizaciones: CotizacionRow[]
}

export default function ListaPanel({ cotizaciones }: Props) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const selectedId   = searchParams.get('id')

  const [query, setQuery]   = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todos')

  const conteos: Record<FiltroEstado, number> = {
    todos:     cotizaciones.length,
    borrador:  cotizaciones.filter((c) => c.estado === 'borrador').length,
    enviada:   cotizaciones.filter((c) => c.estado === 'enviada').length,
    aprobada:  cotizaciones.filter((c) => c.estado === 'aprobada').length,
    rechazada: cotizaciones.filter((c) => c.estado === 'rechazada').length,
  }

  const filtradas = cotizaciones.filter((c) => {
    if (estado !== 'todos' && c.estado !== estado) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return c.numero.toLowerCase().includes(q) || c.cliente_nombre.toLowerCase().includes(q)
  })

  function select(id: string) {
    router.push(`/cotizaciones?id=${id}`, { scroll: false })
  }

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
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-[var(--text-muted)]">
            <FileText className="w-7 h-7 opacity-25" />
            <p className="text-[13px]">Sin resultados</p>
          </div>
        ) : (
          filtradas.map((cot) => {
            const isSelected = cot.id === selectedId
            return (
              <button
                key={cot.id}
                type="button"
                onClick={() => select(cot.id)}
                className={[
                  'w-full text-left px-3 py-3 border-b border-[var(--border-subtle)] transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-[#7c3aed]/[0.08] border-l-2 border-l-[#7c3aed]'
                    : 'hover:bg-[var(--bg-muted)] border-l-2 border-l-transparent',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">{cot.numero}</span>
                  <EstadoBadge estado={cot.estado} />
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] truncate">{cot.cliente_nombre}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-[var(--text-muted)]">{formatFecha(cot.created_at)}</span>
                  <span className="text-[12px] font-medium text-[var(--text-primary)] tabular-nums">{formatCLP(cot.total)}</span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
