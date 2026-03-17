import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Plus, Building2, Mail, Phone, MapPin, Hash, ArrowRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ListaPanel, { type CotizacionRow } from '@/components/cotizaciones/ListaPanel'
import EstadoBadge from '@/components/shared/EstadoBadge'
import NivelPrecioBadge from '@/components/shared/NivelPrecioBadge'
import AccionesCotizacion from '@/components/cotizaciones/AccionesCotizacion'
import { Suspense } from 'react'

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0,
  }).format(n)
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id: selectedId } = await searchParams
  const supabase = await createClient()

  const { data: listData } = await supabase
    .from('cotizaciones')
    .select('id, numero, estado, total, created_at, clientes(nombre)')
    .order('created_at', { ascending: false })

  type RawRow = NonNullable<typeof listData>[number]
  function getNombre(clientes: RawRow['clientes']): string {
    if (!clientes) return '—'
    if (Array.isArray(clientes)) return (clientes as { nombre: string }[])[0]?.nombre ?? '—'
    return (clientes as { nombre: string }).nombre ?? '—'
  }

  const cotizaciones: CotizacionRow[] = (listData ?? []).map((row) => ({
    id:             row.id,
    numero:         row.numero,
    estado:         row.estado as CotizacionRow['estado'],
    total:          row.total,
    created_at:     row.created_at,
    cliente_nombre: getNombre(row.clientes),
  }))

  let detail: Awaited<ReturnType<typeof fetchDetail>> | null = null
  if (selectedId) {
    detail = await fetchDetail(selectedId)
    if (!detail) notFound()
  }

  return (
    <div className="-m-4 md:-m-8 flex h-[calc(100dvh-48px-56px)] md:h-[calc(100dvh-48px)]">

      {/* Left panel — lista */}
      {/* Móvil: visible solo cuando NO hay detail seleccionado */}
      {/* Desktop: siempre visible, 300px fijo */}
      <div className={[
        'shrink-0 flex flex-col h-full',
        selectedId
          ? 'hidden md:flex md:w-[300px]'
          : 'flex w-full md:w-[300px]',
      ].join(' ')}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-r border-[var(--border-default)] bg-[var(--bg-card)]">
          <h1 className="text-[14px] font-semibold text-[var(--text-primary)]">Cotizaciones</h1>
          <Link
            href="/cotizaciones/nueva"
            className="inline-flex items-center gap-1 px-2.5 h-7 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[12px] font-medium rounded-[5px] transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Nueva
          </Link>
        </div>
        <Suspense>
          <ListaPanel cotizaciones={cotizaciones} />
        </Suspense>
      </div>

      {/* Right panel — detalle */}
      {/* Móvil: visible solo cuando HAY detail seleccionado */}
      {/* Desktop: siempre visible, flex-1 */}
      <div className={[
        'flex-1 overflow-y-auto bg-[var(--bg-page)]',
        selectedId ? 'flex flex-col' : 'hidden md:flex md:flex-col',
      ].join(' ')}>
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3">
            <ArrowRight className="w-8 h-8 opacity-20" />
            <p className="text-[14px]">Selecciona una cotización</p>
          </div>
        ) : detail ? (
          <DetailContent detail={detail} id={selectedId} />
        ) : null}
      </div>
    </div>
  )
}

// ── Detail fetcher ────────────────────────────────────────────────────────────

async function fetchDetail(id: string) {
  const supabase = await createClient()

  const { data: cot, error } = await supabase
    .from('cotizaciones')
    .select(`
      id, numero, estado, nivel_precio, subtotal, iva, total,
      notas, asunto, created_at, valida_hasta, enviada_at,
      clientes ( id, nombre, rut, email, telefono, direccion, descuento_porcentaje )
    `)
    .eq('id', id)
    .single()

  if (error || !cot) return null

  const { data: items } = await supabase
    .from('cotizacion_items')
    .select(`
      id, descripcion, ancho, alto, cantidad,
      precio_unitario, subtotal, orden,
      productos ( nombre, unidad )
    `)
    .eq('cotizacion_id', id)
    .order('orden')

  const itemIds = (items ?? []).map((i) => i.id)
  const termsByItem: Record<string, { nombre: string; precio: number; cantidad: number }[]> = {}

  if (itemIds.length > 0) {
    const { data: terms } = await supabase
      .from('cotizacion_item_terminaciones')
      .select('cotizacion_item_id, nombre, precio, cantidad')
      .in('cotizacion_item_id', itemIds)

    for (const t of terms ?? []) {
      if (!termsByItem[t.cotizacion_item_id]) termsByItem[t.cotizacion_item_id] = []
      termsByItem[t.cotizacion_item_id].push({ nombre: t.nombre, precio: t.precio, cantidad: t.cantidad })
    }
  }

  const clienteRaw = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes
  let clienteEmail: string | null = clienteRaw?.email ?? null
  if (!clienteEmail && clienteRaw?.id) {
    const { data: contacto } = await supabase
      .from('contactos')
      .select('email')
      .eq('cliente_id', clienteRaw.id)
      .eq('es_principal', true)
      .maybeSingle()
    clienteEmail = contacto?.email ?? null
  }

  const { data: otExistente } = await supabase
    .from('ordenes_trabajo')
    .select('id, numero')
    .eq('cotizacion_id', id)
    .maybeSingle()

  return { cot, items: items ?? [], termsByItem, clienteEmail, otExistente: otExistente ?? null }
}

// ── Detail UI ─────────────────────────────────────────────────────────────────

type DetailData = NonNullable<Awaited<ReturnType<typeof fetchDetail>>>

function DetailContent({ detail, id }: { detail: DetailData; id: string }) {
  const { cot, items, termsByItem, clienteEmail, otExistente } = detail
  const clienteRaw = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">

      {/* Back button — solo móvil */}
      <Link
        href="/cotizaciones"
        className="md:hidden inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Cotizaciones
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-1">Cotización</p>
          <h2 className="text-[22px] font-semibold text-[var(--text-primary)]">{cot.numero}</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Emitida el {fecha(cot.created_at)}</p>
          {cot.enviada_at && (
            <p className="text-[12px] text-green-500 mt-0.5">
              ✓ Enviada el {new Date(cot.enviada_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las{' '}
              {new Date(cot.enviada_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <EstadoBadge estado={cot.estado} />
            <NivelPrecioBadge
              nivel={cot.nivel_precio as 'normal' | 'empresa' | 'agencia' | 'especial'}
              descuento={clienteRaw?.descuento_porcentaje ?? undefined}
            />
          </div>
          {cot.valida_hasta && (
            <p className="text-[12px] text-[var(--text-muted)]">Válida hasta {fecha(cot.valida_hasta)}</p>
          )}
          <AccionesCotizacion
            id={id}
            numero={cot.numero}
            estado={cot.estado}
            clienteNombre={clienteRaw?.nombre ?? ''}
            clienteEmail={clienteEmail}
            total={clp(cot.total)}
            validaHasta={fecha(cot.valida_hasta)}
            asunto={cot.asunto}
          />
          {cot.estado === 'aprobada' && otExistente && (
            <Link
              href={`/ot/${otExistente.id}`}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-green-400 hover:text-green-300 transition-colors"
            >
              OT: {otExistente.numero} →
            </Link>
          )}
        </div>
      </div>

      {/* Cliente */}
      {clienteRaw && (
        <div className="border border-[var(--border-default)] rounded-[8px] p-4 bg-[var(--bg-card)]">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">Cliente</p>
          <div className="space-y-1.5">
            <Link
              href={`/clientes/${clienteRaw.id}`}
              className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)] hover:text-[#7c3aed] transition-colors"
            >
              <Building2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              {clienteRaw.nombre}
            </Link>
            {clienteRaw.rut && (
              <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                <Hash className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />{clienteRaw.rut}
              </p>
            )}
            {clienteRaw.email && (
              <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] break-all">
                <Mail className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />{clienteRaw.email}
              </p>
            )}
            {clienteRaw.telefono && (
              <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                <Phone className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />{clienteRaw.telefono}
              </p>
            )}
            {clienteRaw.direccion && (
              <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                <MapPin className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />{clienteRaw.direccion}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ítems — tabla con scroll horizontal en móvil */}
      <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Ítems</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full bg-[var(--bg-card)] min-w-[480px]">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
                <th className="text-left px-4 h-8 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Descripción</th>
                <th className="text-left px-3 h-8 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Dimensiones</th>
                <th className="text-right px-3 h-8 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cant.</th>
                <th className="text-right px-3 h-8 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Precio</th>
                <th className="text-right px-4 h-8 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
                const isM2 = prod?.unidad === 'm2' && item.ancho != null && item.alto != null
                const isMl = prod?.unidad === 'ml' && item.ancho != null
                const dims = isM2
                  ? `${item.ancho!.toFixed(2)} × ${item.alto!.toFixed(2)} m²`
                  : isMl ? `${item.ancho!.toFixed(2)} ml` : '—'
                const terms = termsByItem[item.id] ?? []

                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-muted)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-[var(--text-primary)]">{prod?.nombre ?? item.descripcion ?? 'Ítem'}</p>
                        {prod?.nombre && item.descripcion && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.descripcion}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">{dims}</td>
                      <td className="px-3 py-3 text-right text-[13px] text-[var(--text-primary)] tabular-nums">{item.cantidad}</td>
                      <td className="px-3 py-3 text-right text-[13px] text-[var(--text-primary)] tabular-nums whitespace-nowrap">{clp(item.precio_unitario)}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold text-[var(--text-primary)] tabular-nums whitespace-nowrap">{clp(item.subtotal)}</td>
                    </tr>
                    {terms.map((t, j) => (
                      <tr key={`${item.id}-t${j}`} className="border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]">
                        <td className="px-4 py-2 pl-9 text-[11px] text-[var(--text-secondary)]">+ {t.nombre}</td>
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2 text-right text-[11px] text-[var(--text-secondary)] tabular-nums">{t.cantidad}</td>
                        <td className="px-3 py-2 text-right text-[11px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">{clp(t.precio)}</td>
                        <td className="px-4 py-2 text-right text-[11px] text-[var(--text-secondary)] tabular-nums whitespace-nowrap">{clp(t.precio * t.cantidad)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div className="flex justify-end">
        <div className="w-full sm:w-64 border border-[var(--border-default)] rounded-[8px] overflow-hidden bg-[var(--bg-card)]">
          <div className="px-4 py-3 flex justify-between text-[13px] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
            <span>Subtotal neto</span>
            <span className="tabular-nums">{clp(cot.subtotal)}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-[13px] text-[var(--text-secondary)] border-b border-[var(--border-default)]">
            <span>IVA 19%</span>
            <span className="tabular-nums">{clp(cot.iva)}</span>
          </div>
          <div className="px-4 py-4 flex justify-between bg-[var(--bg-muted)]">
            <span className="text-[15px] font-semibold text-[var(--text-primary)]">Total</span>
            <span className="text-[17px] font-semibold text-[var(--text-primary)] tabular-nums">{clp(cot.total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {cot.notas && (
        <div className="border border-[var(--border-default)] rounded-[8px] p-4 bg-[var(--bg-card)]">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">Notas</p>
          <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{cot.notas}</p>
        </div>
      )}

      <p className="text-[12px] text-[var(--text-muted)]">
        Precios netos, no incluyen IVA. Validez 30 días desde emisión. Sujeto a disponibilidad de materiales.
      </p>
    </div>
  )
}
