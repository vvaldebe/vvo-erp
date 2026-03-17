import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'
import EstadoBadge from '@/components/shared/EstadoBadge'

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n)
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type EstadoFilter = 'todas' | 'pendiente' | 'pagada' | 'vencida' | 'anulada'

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado: estadoParam } = await searchParams
  const filtro: EstadoFilter = (['pendiente', 'pagada', 'vencida', 'anulada'].includes(estadoParam ?? '')
    ? estadoParam as EstadoFilter
    : 'todas')

  const supabase = await createClient()

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  let query = supabase
    .from('facturas')
    .select('id, numero_sii, fecha_emision, fecha_vencimiento, monto_neto, iva, total, estado, notas, ot_id, cotizacion_id, clientes(nombre), ordenes_trabajo(numero), cotizaciones(numero)')
    .order('fecha_emision', { ascending: false })

  if (filtro !== 'todas') {
    query = query.eq('estado', filtro)
  }

  const [
    { data: facturas },
    { data: pendienteRows },
    { data: cobradoMesRows },
    { data: vencidasRows },
  ] = await Promise.all([
    query,
    supabase.from('facturas').select('total').eq('estado', 'pendiente'),
    supabase.from('facturas').select('total').eq('estado', 'pagada').gte('fecha_emision', inicioMes),
    supabase.from('facturas').select('id', { count: 'exact', head: false }).eq('estado', 'vencida'),
  ])

  const totalPendiente = (pendienteRows ?? []).reduce((s, r) => s + (r.total ?? 0), 0)
  const cobradoMes     = (cobradoMesRows ?? []).reduce((s, r) => s + (r.total ?? 0), 0)
  const countVencidas  = (vencidasRows ?? []).length

  const TABS: { key: EstadoFilter; label: string }[] = [
    { key: 'todas',     label: 'Todas' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'pagada',    label: 'Pagadas' },
    { key: 'vencida',   label: 'Vencidas' },
    { key: 'anulada',   label: 'Anuladas' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)]">Facturas</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Seguimiento de facturas emitidas y pagos recibidos</p>
        </div>
        <Link
          href="/facturas/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-[6px] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva factura
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-[var(--border-default)] rounded-[8px] p-4">
          <p className="text-[12px] text-[var(--text-secondary)]">Por cobrar</p>
          <p className="text-[24px] font-semibold text-[var(--text-primary)] tabular-nums mt-1">{clp(totalPendiente)}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">facturas pendientes</p>
        </div>
        <div className="border border-[var(--border-default)] rounded-[8px] p-4">
          <p className="text-[12px] text-[var(--text-secondary)]">Cobrado este mes</p>
          <p className="text-[24px] font-semibold text-[var(--text-primary)] tabular-nums mt-1">{clp(cobradoMes)}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">facturas pagadas del mes</p>
        </div>
        <div className="border border-[var(--border-default)] rounded-[8px] p-4">
          <p className="text-[12px] text-[var(--text-secondary)]">Vencidas</p>
          <p className={`text-[24px] font-semibold tabular-nums mt-1 ${countVencidas > 0 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
            {countVencidas}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">requieren atención</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
        <div className="flex border-b border-[var(--border-default)]">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === 'todas' ? '/facturas' : `/facturas?estado=${tab.key}`}
              className={`px-4 py-3 text-[13px] font-medium transition-colors ${
                filtro === tab.key
                  ? 'text-[var(--text-accent)] border-b-2 border-[var(--text-accent)] -mb-px'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Tabla */}
        {(facturas ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center text-[14px] text-[var(--text-muted)]">
            No hay facturas{filtro !== 'todas' ? ` con estado "${filtro}"` : ''}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">N° SII</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Origen</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Emisión</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Venc.</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {(facturas ?? []).map((f) => {
                const cliente = Array.isArray(f.clientes) ? f.clientes[0] : f.clientes
                const ot      = Array.isArray(f.ordenes_trabajo) ? f.ordenes_trabajo[0] : f.ordenes_trabajo
                const cot     = Array.isArray(f.cotizaciones) ? f.cotizaciones[0] : f.cotizaciones
                return (
                  <tr key={f.id} className="hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/facturas/${f.id}`} className="text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--text-accent)] transition-colors">
                        {f.numero_sii ?? <span className="text-[var(--text-muted)] italic">Sin nº</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[var(--text-primary)]">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      {ot ? (
                        <Link href={`/ot/${f.ot_id}`} className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-accent)] font-mono">{ot.numero}</Link>
                      ) : cot ? (
                        <Link href={`/cotizaciones/${f.cotizacion_id}`} className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-accent)] font-mono">{cot.numero}</Link>
                      ) : (
                        <span className="text-[12px] text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{fecha(f.fecha_emision)}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{fecha(f.fecha_vencimiento)}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">{clp(f.total ?? 0)}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={f.estado as 'pendiente' | 'pagada' | 'vencida' | 'anulada'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
