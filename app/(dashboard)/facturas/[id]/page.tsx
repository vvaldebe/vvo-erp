import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, Calendar, CreditCard, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import EstadoBadge from '@/components/shared/EstadoBadge'
import RegistrarPagoForm from '@/components/facturas/RegistrarPagoForm'
import AccionesFactura from '@/components/facturas/AccionesFactura'

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n)
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const METODO_LABEL: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo:      'Efectivo',
  cheque:        'Cheque',
  tarjeta:       'Tarjeta',
}

export default async function FacturaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: factura }, { data: pagos }] = await Promise.all([
    supabase
      .from('facturas')
      .select('*, clientes(nombre, email, rut), ordenes_trabajo(id, numero), cotizaciones(id, numero)')
      .eq('id', id)
      .single(),
    supabase
      .from('pagos')
      .select('*')
      .eq('factura_id', id)
      .order('fecha', { ascending: false }),
  ])

  if (!factura) notFound()

  const cliente  = Array.isArray(factura.clientes)       ? factura.clientes[0]       : factura.clientes
  const ot       = Array.isArray(factura.ordenes_trabajo) ? factura.ordenes_trabajo[0] : factura.ordenes_trabajo
  const cot      = Array.isArray(factura.cotizaciones)    ? factura.cotizaciones[0]    : factura.cotizaciones

  const totalPagado  = (pagos ?? []).reduce((s, p) => s + p.monto, 0)
  const saldoPendiente = Math.max(0, factura.total - totalPagado)
  const puedeRegistrarPago = factura.estado !== 'pagada' && factura.estado !== 'anulada'

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Breadcrumb / Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/facturas"
          className="w-9 h-9 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#d4d4d8] transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">
              {factura.numero_sii ? `Factura N° ${factura.numero_sii}` : 'Factura sin folio SII'}
            </h1>
            <EstadoBadge estado={factura.estado as 'pendiente' | 'pagada' | 'vencida' | 'anulada'} />
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Registrada el {fecha(factura.created_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Main */}
        <div className="xl:col-span-2 space-y-5">

          {/* Info */}
          <div className="border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Información</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-0.5">Cliente</p>
                  {cliente ? (
                    <>
                      <p className="font-medium text-[var(--text-primary)]">{cliente.nombre}</p>
                      {cliente.rut && <p className="text-[var(--text-secondary)]">{cliente.rut}</p>}
                    </>
                  ) : (
                    <p className="text-[var(--text-muted)] italic">Sin cliente</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-0.5">Fechas</p>
                  <p className="text-[var(--text-primary)]">Emisión: <span className="font-medium">{fecha(factura.fecha_emision)}</span></p>
                  {factura.fecha_vencimiento && (
                    <p className="text-[var(--text-secondary)]">Vence: {fecha(factura.fecha_vencimiento)}</p>
                  )}
                </div>
              </div>

              {(ot || cot) && (
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium mb-0.5">Origen</p>
                    {ot && (
                      <Link href={`/ot/${ot.id}`} className="text-[var(--text-accent)] hover:underline font-medium font-mono">
                        {ot.numero}
                      </Link>
                    )}
                    {cot && (
                      <Link href={`/cotizaciones/${cot.id}`} className="text-[var(--text-accent)] hover:underline font-medium font-mono">
                        {cot.numero}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {factura.notas && (
              <div className="bg-[var(--bg-muted)] rounded-[6px] px-4 py-3">
                <p className="text-[12px] text-[var(--text-secondary)] font-medium uppercase tracking-wider mb-1">Notas</p>
                <p className="text-[13px] text-[var(--text-primary)]">{factura.notas}</p>
              </div>
            )}
          </div>

          {/* Montos */}
          <div className="border border-[var(--border-default)] rounded-[8px] p-5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-4">Resumen de montos</p>

            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">Neto</span>
                <span className="text-[var(--text-primary)] tabular-nums">{clp(factura.monto_neto)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">IVA 19%</span>
                <span className="text-[var(--text-primary)] tabular-nums">{clp(factura.iva)}</span>
              </div>
              <div className="flex justify-between text-[14px] font-semibold border-t border-[var(--border-default)] pt-2 mt-2">
                <span className="text-[var(--text-primary)]">Total factura</span>
                <span className="text-[var(--text-primary)] tabular-nums">{clp(factura.total)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">Total pagado</span>
                <span className="text-green-700 tabular-nums font-medium">{clp(totalPagado)}</span>
              </div>
              {saldoPendiente > 0 && (
                <div className="flex justify-between text-[13px] font-semibold">
                  <span className="text-[var(--text-secondary)]">Saldo pendiente</span>
                  <span className="text-amber-600 tabular-nums">{clp(saldoPendiente)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pagos */}
          <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Pagos recibidos</p>
            </div>

            {(pagos ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)]">
                No se han registrado pagos
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Método</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {(pagos ?? []).map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{fecha(p.fecha)}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-primary)]">{METODO_LABEL[p.metodo] ?? p.metodo}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">{clp(p.monto)}</td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">{p.notas ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Registrar pago */}
          {puedeRegistrarPago && (
            <div className="border border-[var(--border-default)] rounded-[8px] p-5">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-4">Registrar pago</p>
              <RegistrarPagoForm facturaId={factura.id} pendiente={saldoPendiente} />
            </div>
          )}

          {/* Acciones */}
          <div className="border border-[var(--border-default)] rounded-[8px] p-5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-4">Acciones</p>
            <AccionesFactura facturaId={factura.id} estadoActual={factura.estado as 'pendiente' | 'pagada' | 'vencida' | 'anulada'} />
          </div>

        </div>
      </div>
    </div>
  )
}
