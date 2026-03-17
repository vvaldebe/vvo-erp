'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style:    'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
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

export default function TablaCotizaciones({ cotizaciones }: Props) {
  const router = useRouter()
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
    return (
      c.numero.toLowerCase().includes(q) ||
      c.cliente_nombre.toLowerCase().includes(q)
    )
  })

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] overflow-hidden">

      {/* Toolbar: tabs + búsqueda */}
      <div className="flex items-center gap-3 px-4 border-b border-[var(--border-default)] h-11">
        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          {TABS.map((tab) => {
            const isActive = estado === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setEstado(tab.value)}
                className={[
                  'h-7 px-2.5 text-[12px] font-medium rounded-[5px] transition-colors cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-[#f4f4f5] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]',
                ].join(' ')}
              >
                {tab.label}
                {conteos[tab.value] > 0 && (
                  <span className={`ml-1.5 text-[11px] ${isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                    {conteos[tab.value]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="w-px h-4 bg-[#e4e4e7]" />

        {/* Búsqueda */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar cliente o número..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 h-7 text-[12px] bg-[var(--bg-muted)] border border-[var(--border-default)] rounded-[5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors"
          />
        </div>

        {(query || estado !== 'todos') && (
          <span className="ml-auto text-[11px] text-[var(--text-muted)]">
            {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide whitespace-nowrap">
                Fecha
              </th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide whitespace-nowrap">
                Número
              </th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Cliente
              </th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Estado
              </th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <FileText className="w-8 h-8 opacity-25" />
                    <p className="text-[13px]">
                      {query || estado !== 'todos'
                        ? 'Sin resultados para los filtros aplicados'
                        : 'No hay cotizaciones aún'}
                    </p>
                    {!query && estado === 'todos' && (
                      <p className="text-[12px] text-[var(--text-faint)]">
                        Crea la primera cotización con el botón de arriba
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtradas.map((cot) => (
                <tr
                  key={cot.id}
                  onClick={() => router.push(`/cotizaciones/${cot.id}`)}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-muted)] cursor-pointer transition-colors"
                >
                  <td className="px-4 h-11 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                    {formatFecha(cot.created_at)}
                  </td>
                  <td className="px-4 h-11">
                    <span className="text-[14px] font-medium text-[var(--text-primary)]">
                      {cot.numero}
                    </span>
                  </td>
                  <td className="px-4 h-11 text-[13px] text-[var(--text-primary)]">
                    {cot.cliente_nombre}
                  </td>
                  <td className="px-4 h-11">
                    <EstadoBadge estado={cot.estado} />
                  </td>
                  <td className="px-4 h-11 text-right">
                    <span className="text-[14px] font-medium text-[var(--text-primary)] tabular-nums">
                      {formatCLP(cot.total)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtradas.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]">
          <p className="text-[11px] text-[var(--text-muted)]">
            {filtradas.length} cotización{filtradas.length !== 1 ? 'es' : ''}
            {estado !== 'todos' && ` · ${estado}`}
          </p>
        </div>
      )}
    </div>
  )
}
