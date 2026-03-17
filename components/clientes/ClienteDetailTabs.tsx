'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Cotizacion, OrdenTrabajo, Factura, EstadoCotizacion, EstadoOT, EstadoFactura } from '@/types/database.types'

type CotizacionRow = Pick<Cotizacion, 'id' | 'numero' | 'estado' | 'total' | 'created_at'>
type OTRow         = Pick<OrdenTrabajo, 'id' | 'numero' | 'estado' | 'total' | 'fecha_entrega'>
type FacturaRow    = Pick<Factura, 'id' | 'numero_sii' | 'estado' | 'total' | 'fecha_emision'>

interface Props {
  cotizaciones: CotizacionRow[]
  ots:          OTRow[]
  facturas:     FacturaRow[]
}

type Tab = 'cotizaciones' | 'ots' | 'facturas'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}

// ── Estado badges ──────────────────────────────────────────────────────────

const COTIZACION_ESTADO: Record<EstadoCotizacion, { label: string; cls: string }> = {
  borrador:   { label: 'Borrador',   cls: 'bg-[var(--bg-muted)] text-[var(--text-muted)] border-[var(--border-default)]' },
  enviada:    { label: 'Enviada',    cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  aprobada:   { label: 'Aprobada',   cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
  rechazada:  { label: 'Rechazada',  cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

const OT_ESTADO: Record<EstadoOT, { label: string; cls: string }> = {
  pendiente:      { label: 'Pendiente',     cls: 'bg-[var(--bg-muted)] text-[var(--text-muted)] border-[var(--border-default)]' },
  en_produccion:  { label: 'En producción', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  terminado:      { label: 'Terminado',     cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  entregado:      { label: 'Entregado',     cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
}

const FACTURA_ESTADO: Record<EstadoFactura, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  pagada:    { label: 'Pagada',    cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
  vencida:   { label: 'Vencida',   cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
  anulada:   { label: 'Anulada',   cls: 'bg-[var(--bg-muted)] text-[var(--text-muted)] border-[var(--border-default)]' },
}

function EstadoBadge({ cls, label }: { cls: string; label: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] border text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-[13px] text-[var(--text-muted)]">{message}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ClienteDetailTabs({ cotizaciones, ots, facturas }: Props) {
  const [tab, setTab] = useState<Tab>('cotizaciones')

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'cotizaciones', label: 'Cotizaciones', count: cotizaciones.length },
    { key: 'ots',          label: 'OTs',          count: ots.length },
    { key: 'facturas',     label: 'Facturas',     count: facturas.length },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b border-[var(--border-default)] px-5 flex items-center gap-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              'flex items-center gap-1.5 px-4 h-11 text-[13px] font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-[#7c3aed] text-[#7c3aed]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {t.label}
            <span className={[
              'inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-full',
              tab === t.key ? 'bg-[#7c3aed]/15 text-[#7c3aed]' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]',
            ].join(' ')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* Cotizaciones */}
        {tab === 'cotizaciones' && (
          cotizaciones.length === 0 ? (
            <EmptyState message="Sin cotizaciones para este cliente" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
                  <th className="text-left px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">N°</th>
                  <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Total</th>
                  <th className="text-right px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-5 h-10">
                      <Link
                        href={`/cotizaciones/${c.id}`}
                        className="text-[13px] font-medium text-[#7c3aed] hover:underline"
                      >
                        {c.numero}
                      </Link>
                    </td>
                    <td className="px-4 h-10">
                      <EstadoBadge {...COTIZACION_ESTADO[c.estado]} />
                    </td>
                    <td className="px-4 h-10 text-right text-[13px] font-mono text-[var(--text-primary)]">
                      {formatCLP(c.total)}
                    </td>
                    <td className="px-5 h-10 text-right text-[12px] text-[var(--text-muted)]">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* OTs */}
        {tab === 'ots' && (
          ots.length === 0 ? (
            <EmptyState message="Sin órdenes de trabajo para este cliente" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
                  <th className="text-left px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">N°</th>
                  <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Total</th>
                  <th className="text-right px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {ots.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-5 h-10">
                      <Link
                        href={`/ot/${o.id}`}
                        className="text-[13px] font-medium text-[#7c3aed] hover:underline"
                      >
                        {o.numero}
                      </Link>
                    </td>
                    <td className="px-4 h-10">
                      <EstadoBadge {...OT_ESTADO[o.estado]} />
                    </td>
                    <td className="px-4 h-10 text-right text-[13px] font-mono text-[var(--text-primary)]">
                      {formatCLP(o.total)}
                    </td>
                    <td className="px-5 h-10 text-right text-[12px] text-[var(--text-muted)]">
                      {formatDate(o.fecha_entrega)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Facturas */}
        {tab === 'facturas' && (
          facturas.length === 0 ? (
            <EmptyState message="Sin facturas para este cliente" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
                  <th className="text-left px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">N° SII</th>
                  <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Total</th>
                  <th className="text-right px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Emisión</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-5 h-10">
                      <Link
                        href={`/facturas/${f.id}`}
                        className="text-[13px] font-medium text-[#7c3aed] hover:underline"
                      >
                        {f.numero_sii ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 h-10">
                      <EstadoBadge {...FACTURA_ESTADO[f.estado]} />
                    </td>
                    <td className="px-4 h-10 text-right text-[13px] font-mono text-[var(--text-primary)]">
                      {formatCLP(f.total)}
                    </td>
                    <td className="px-5 h-10 text-right text-[12px] text-[var(--text-muted)]">
                      {formatDate(f.fecha_emision)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
