import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EstadoBadge from '@/components/shared/EstadoBadge'

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0,
  }).format(n)
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const ESTADOS = ['pendiente', 'en_produccion', 'terminado', 'entregado'] as const

export default async function OTPage() {
  const supabase = await createClient()

  const { data: ots } = await supabase
    .from('ordenes_trabajo')
    .select(`
      id, numero, estado, fecha_entrega, total, created_at,
      clientes ( nombre ),
      cotizaciones ( numero )
    `)
    .order('created_at', { ascending: false })

  const rows = (ots ?? []).map((ot) => {
    const cliente    = Array.isArray(ot.clientes)    ? ot.clientes[0]    : ot.clientes
    const cotizacion = Array.isArray(ot.cotizaciones) ? ot.cotizaciones[0] : ot.cotizaciones
    return { ...ot, cliente_nombre: cliente?.nombre ?? null, cotizacion_numero: cotizacion?.numero ?? null }
  })

  // Conteos por estado
  const conteos = ESTADOS.reduce((acc, e) => {
    acc[e] = rows.filter((r) => r.estado === e).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Órdenes de trabajo</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{rows.length} en total</p>
        </div>
        <Link
          href="/ot/nueva"
          className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[13px] font-medium rounded-[6px] transition-colors"
        >
          + Nueva OT
        </Link>
      </div>

      {/* Cards de estado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ESTADOS.map((e) => (
          <div key={e} className="border border-[var(--border-default)] rounded-[8px] p-4">
            <p className="text-[12px] text-[var(--text-secondary)] mb-1 capitalize">{e.replace('_', ' ')}</p>
            <p className="text-[24px] font-semibold text-[var(--text-primary)] tabular-nums">{conteos[e] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
              <th className="text-left px-4 h-10 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">OT</th>
              <th className="text-left px-4 h-10 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 h-10 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cotización</th>
              <th className="text-left px-4 h-10 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 h-10 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Entrega</th>
              <th className="text-right px-4 h-10 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-[var(--text-muted)]">
                  No hay órdenes de trabajo aún
                </td>
              </tr>
            )}
            {rows.map((ot, i) => (
              <tr
                key={ot.id}
                className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-muted)] cursor-pointer transition-colors ${i % 2 === 1 ? 'bg-[var(--bg-muted)]' : 'bg-[var(--bg-card)]'}`}
              >
                <td className="px-4 py-3">
                  <Link href={`/ot/${ot.id}`} className="text-[14px] font-semibold text-[#7c3aed] hover:underline">
                    {ot.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[14px] text-[var(--text-primary)]">{ot.cliente_nombre ?? <span className="text-[var(--text-muted)]">Sin cliente</span>}</td>
                <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)] font-mono">{ot.cotizacion_numero ?? '—'}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={ot.estado as 'pendiente' | 'en_produccion' | 'terminado' | 'entregado'} />
                </td>
                <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{fecha(ot.fecha_entrega)}</td>
                <td className="px-4 py-3 text-right font-mono text-[13px] text-[var(--text-primary)] tabular-nums">{clp(ot.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

    </div>
  )
}
