import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FileText, ClipboardList, Receipt, TrendingUp } from 'lucide-react'
import EstadoBadge from '@/components/shared/EstadoBadge'

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n)
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const hoy        = new Date()
  const inicioMes  = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  const hace3dias  = new Date(Date.now() - 3 * 86400000).toISOString()
  const en7dias    = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [
    { data: { user } },
    { count: cotizacionesActivas },
    { count: otsEnProduccion },
    { count: facturasPendientes },
    { data: facturadoRows },
    { data: cotizacionesSinRespuesta },
    { data: otsActivas },
    { data: facturasPorVencer },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('cotizaciones').select('*', { count: 'exact', head: true }).in('estado', ['borrador', 'enviada']),
    supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).in('estado', ['pendiente', 'en_produccion']),
    supabase.from('facturas').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('facturas').select('total').eq('estado', 'pagada').gte('fecha_emision', inicioMes),
    supabase
      .from('cotizaciones')
      .select('id, numero, created_at, clientes(nombre)')
      .eq('estado', 'enviada')
      .lte('updated_at', hace3dias)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('ordenes_trabajo')
      .select('id, numero, estado, fecha_entrega, clientes(nombre)')
      .in('estado', ['pendiente', 'en_produccion', 'terminado'])
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('facturas')
      .select('id, numero_sii, total, fecha_vencimiento, clientes(nombre)')
      .in('estado', ['pendiente', 'vencida'])
      .lte('fecha_vencimiento', en7dias)
      .order('fecha_vencimiento')
      .limit(5),
  ])

  const facturadoMes = (facturadoRows ?? []).reduce((sum, r) => sum + (r.total ?? 0), 0)
  const nombre       = user?.email?.split('@')[0] ?? 'equipo'

  // Conteos OT por estado
  const otConteos = {
    pendiente:     (otsActivas ?? []).filter((o) => o.estado === 'pendiente').length,
    en_produccion: (otsActivas ?? []).filter((o) => o.estado === 'en_produccion').length,
    terminado:     (otsActivas ?? []).filter((o) => o.estado === 'terminado').length,
  }

  return (
    <div className="max-w-5xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)]">Hola, {nombre}</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">Resumen de actividad</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={FileText}      label="Cotizaciones activas"  value={String(cotizacionesActivas ?? 0)} sub="borrador + enviadas"       href="/cotizaciones" />
        <MetricCard icon={ClipboardList} label="OTs en curso"          value={String(otsEnProduccion ?? 0)}    sub="pendiente + en producción" href="/ot" />
        <MetricCard icon={Receipt}       label="Facturas pendientes"   value={String(facturasPendientes ?? 0)} sub="sin pago registrado"       href="/facturas" />
        <MetricCard icon={TrendingUp}    label="Facturado este mes"    value={clp(facturadoMes)}               sub="facturas pagadas del mes"  href="/facturas" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* OTs activas por estado */}
        <div className="border border-[var(--border-default)] rounded-[8px]">
          <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">OTs activas</p>
            <Link href="/ot" className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors">Ver todas →</Link>
          </div>

          {/* Mini kanban */}
          <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
            {(['pendiente', 'en_produccion', 'terminado'] as const).map((e) => (
              <div key={e} className="p-4 text-center">
                <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-2">{e.replace('_', ' ')}</p>
                <p className="text-[28px] font-semibold text-[var(--text-primary)] tabular-nums">{otConteos[e]}</p>
              </div>
            ))}
          </div>

          {/* Lista reciente */}
          {(otsActivas ?? []).length > 0 && (
            <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
              {(otsActivas ?? []).slice(0, 5).map((ot) => {
                const cliente = Array.isArray(ot.clientes) ? ot.clientes[0] : ot.clientes
                return (
                  <Link key={ot.id} href={`/ot/${ot.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-muted)] transition-colors">
                    <div>
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">{ot.numero}</span>
                      {cliente?.nombre && <span className="text-[12px] text-[var(--text-secondary)] ml-2">{cliente.nombre}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {ot.fecha_entrega && <span className="text-[11px] text-[var(--text-muted)]">{fecha(ot.fecha_entrega)}</span>}
                      <EstadoBadge estado={ot.estado as 'pendiente' | 'en_produccion' | 'terminado'} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Cotizaciones enviadas sin respuesta >3 días */}
        <div className="border border-[var(--border-default)] rounded-[8px]">
          <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">Sin respuesta <span className="text-[var(--text-muted)] font-normal">(+3 días)</span></p>
            <Link href="/cotizaciones?estado=enviada" className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors">Ver todas →</Link>
          </div>

          {(cotizacionesSinRespuesta ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)]">
              No hay cotizaciones pendientes de respuesta
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {(cotizacionesSinRespuesta ?? []).map((cot) => {
                const cliente = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes
                const diasDesde = Math.floor((Date.now() - new Date(cot.created_at).getTime()) / 86400000)
                return (
                  <Link key={cot.id} href={`/cotizaciones/${cot.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-muted)] transition-colors">
                    <div>
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">{cot.numero}</span>
                      {cliente?.nombre && <p className="text-[12px] text-[var(--text-secondary)]">{cliente.nombre}</p>}
                    </div>
                    <span className="text-[12px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-[4px]">
                      {diasDesde}d
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Facturas por vencer */}
      <div className="border border-[var(--border-default)] rounded-[8px]">
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Facturas por vencer <span className="text-[var(--text-muted)] font-normal">(próximos 7 días)</span></p>
          <Link href="/facturas?estado=pendiente" className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors">Ver todas →</Link>
        </div>

        {(facturasPorVencer ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)]">
            No hay facturas próximas a vencer
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {(facturasPorVencer ?? []).map((f) => {
              const cliente = Array.isArray(f.clientes) ? f.clientes[0] : f.clientes
              return (
                <Link key={f.id} href={`/facturas/${f.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-muted)] transition-colors">
                  <div>
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      {f.numero_sii ?? <span className="italic text-[var(--text-muted)]">Sin folio</span>}
                    </span>
                    {cliente?.nombre && <p className="text-[12px] text-[var(--text-secondary)]">{cliente.nombre}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] text-[var(--text-muted)]">{fecha(f.fecha_vencimiento)}</span>
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">{clp(f.total ?? 0)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

function MetricCard({
  icon: Icon, label, value, sub, href,
}: {
  icon: React.ElementType; label: string; value: string; sub: string; href: string
}) {
  return (
    <Link href={href} className="border border-[var(--border-default)] rounded-[8px] p-5 bg-[var(--bg-card)] hover:border-[#d4d4d8] transition-colors block">
      <div className="flex items-start justify-between mb-4">
        <span className="text-[13px] text-[var(--text-secondary)] leading-tight">{label}</span>
        <Icon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
      </div>
      <p className="text-[30px] font-semibold text-[var(--text-primary)] leading-none tabular-nums">{value}</p>
      <p className="text-[12px] text-[var(--text-muted)] mt-2">{sub}</p>
    </Link>
  )
}
