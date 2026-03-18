import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import EstadoBadge from '@/components/shared/EstadoBadge'
import AccionesOT from '@/components/ot/AccionesOT'
import NotasInternasEditor from '@/components/shared/NotasInternasEditor'

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

export default async function OTDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: ot, error }, { data: maquinas }] = await Promise.all([
    supabase
      .from('ordenes_trabajo')
      .select(`
        id, numero, estado, fecha_entrega, notas_produccion, notas_internas, archivo_diseno,
        subtotal, total, created_at,
        maquina_id,
        clientes ( id, nombre, email, telefono ),
        cotizaciones ( id, numero, nivel_precio )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('maquinas')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),
  ])

  if (error || !ot) notFound()

  const clienteRaw    = Array.isArray(ot.clientes)    ? ot.clientes[0]    : ot.clientes
  const cotizacionRaw = Array.isArray(ot.cotizaciones) ? ot.cotizaciones[0] : ot.cotizaciones

  // Items: si viene de cotización, los tomamos de cotizacion_items
  let items: {
    id: string
    titulo_item: string | null
    descripcion: string | null
    ancho: number | null
    alto: number | null
    cantidad: number
    precio_unitario: number
    subtotal: number
    producto_nombre: string | null
    unidad: string | null
  }[] = []

  if (cotizacionRaw?.id) {
    const { data: cotItems } = await supabase
      .from('cotizacion_items')
      .select('id, titulo_item, descripcion, ancho, alto, cantidad, precio_unitario, subtotal, orden, productos(nombre, unidad)')
      .eq('cotizacion_id', cotizacionRaw.id)
      .order('orden')

    items = (cotItems ?? []).map((item) => {
      const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
      const itemAny = item as typeof item & { titulo_item?: string | null }
      return {
        id:              item.id,
        titulo_item:     itemAny.titulo_item ?? null,
        descripcion:     item.descripcion,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal:        item.subtotal,
        producto_nombre: prod?.nombre ?? null,
        unidad:          prod?.unidad ?? null,
      }
    })
  } else {
    // OT directa: usar ot_items
    const { data: otItems } = await supabase
      .from('ot_items')
      .select('id, descripcion, ancho, alto, cantidad, precio_unitario, subtotal, orden, productos(nombre, unidad)')
      .eq('ot_id', id)
      .order('orden')

    items = (otItems ?? []).map((item) => {
      const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
      return {
        id:              item.id,
        titulo_item:     null,
        descripcion:     item.descripcion,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal:        item.subtotal,
        producto_nombre: prod?.nombre ?? null,
        unidad:          prod?.unidad ?? null,
      }
    })
  }

  // Máquina actual
  const maquinaActual = (maquinas ?? []).find((m) => m.id === ot.maquina_id)

  return (
    <div className="max-w-5xl space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/ot"
          className="flex items-center gap-1.5 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Órdenes de trabajo
        </Link>
        <span className="text-[var(--text-faint)]">/</span>
        <span className="text-[14px] font-medium text-[var(--text-primary)]">{ot.numero}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Columna principal ── */}
        <div className="flex-1 min-w-0 space-y-5 w-full">

          {/* Header */}
          <div className="border border-[var(--border-default)] rounded-[8px] p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-1">Orden de Trabajo</p>
              <h1 className="text-[26px] font-semibold text-[var(--text-primary)]">{ot.numero}</h1>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">Creada el {fecha(ot.created_at)}</p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <EstadoBadge estado={ot.estado as 'pendiente' | 'en_produccion' | 'terminado' | 'entregado'} />
              <p className="text-[12px] text-[var(--text-secondary)]">
                Entrega:{' '}
                <span className={`font-medium ${ot.fecha_entrega ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)] italic'}`}>
                  {ot.fecha_entrega ? fecha(ot.fecha_entrega) : 'Sin fecha'}
                </span>
              </p>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Máquina:{' '}
                <span className={`font-medium ${maquinaActual ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)] italic'}`}>
                  {maquinaActual ? maquinaActual.nombre : 'Sin asignar'}
                </span>
              </p>
            </div>
          </div>

          {/* Cotización origen */}
          {cotizacionRaw && (
            <div className="border border-[var(--border-default)] rounded-[8px] p-4 flex items-center justify-between bg-[var(--bg-muted)]">
              <p className="text-[13px] text-[var(--text-secondary)]">
                Generada desde cotización
              </p>
              <Link
                href={`/cotizaciones/${cotizacionRaw.id}`}
                className="text-[13px] font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
              >
                {cotizacionRaw.numero} →
              </Link>
            </div>
          )}

          {/* Cliente */}
          {clienteRaw && (
            <div className="border border-[var(--border-default)] rounded-[8px] p-5">
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-3">Cliente</p>
              <Link
                href={`/clientes/${clienteRaw.id}`}
                className="text-[15px] font-semibold text-[var(--text-primary)] hover:text-[#7c3aed] transition-colors"
              >
                {clienteRaw.nombre}
              </Link>
              <div className="mt-1.5 space-y-0.5 text-[13px] text-[var(--text-secondary)]">
                {clienteRaw.email    && <p>{clienteRaw.email}</p>}
                {clienteRaw.telefono && <p>{clienteRaw.telefono}</p>}
              </div>
            </div>
          )}

          {/* Tabla ítems */}
          {items.length > 0 && (
            <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
                <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em]">Trabajos</p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Descripción</th>
                    <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Dimensiones</th>
                    <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cant.</th>
                    <th className="text-right px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const isM2 = item.unidad === 'm2' && item.ancho != null && item.alto != null
                    const isMl = item.unidad === 'ml' && item.ancho != null
                    const dims = isM2
                      ? `${item.ancho!.toFixed(2)} × ${item.alto!.toFixed(2)} m²`
                      : isMl
                      ? `${item.ancho!.toFixed(2)} ml`
                      : '—'

                    return (
                      <tr key={item.id} className={`border-b border-[var(--border-subtle)] ${i % 2 === 1 ? 'bg-[var(--bg-muted)]' : ''}`}>
                        <td className="px-5 py-3.5">
                          <p className="text-[14px] font-medium text-[var(--text-primary)]">
                            {item.producto_nombre ?? item.titulo_item ?? item.descripcion ?? 'Ítem'}
                          </p>
                          {/* Subtitle: descripcion when not used as title */}
                          {item.producto_nombre && item.descripcion && (
                            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{item.descripcion}</p>
                          )}
                          {!item.producto_nombre && item.titulo_item && item.descripcion && (
                            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{item.descripcion}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[14px] text-[var(--text-secondary)]">{dims}</td>
                        <td className="px-4 py-3.5 text-right text-[14px] tabular-nums">{item.cantidad}</td>
                        <td className="px-5 py-3.5 text-right text-[14px] font-semibold tabular-nums">{clp(item.subtotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              </div>
              <div className="px-5 py-4 border-t border-[var(--border-default)] flex justify-end gap-8 bg-[var(--bg-muted)]">
                <span className="text-[14px] text-[var(--text-secondary)]">Total</span>
                <span className="text-[16px] font-semibold text-[var(--text-primary)] tabular-nums">{clp(ot.total)}</span>
              </div>
            </div>
          )}

          {/* Notas de producción (read-only si no hay) */}
          {ot.notas_produccion && (
            <div className="border border-[var(--border-default)] rounded-[8px] p-5">
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">Notas de producción</p>
              <p className="text-[14px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{ot.notas_produccion}</p>
            </div>
          )}

          {/* Notas internas */}
          <NotasInternasEditor
            id={id}
            tipo="ot"
            valor={(ot as { notas_internas?: string | null }).notas_internas ?? null}
          />

          {/* Archivo de diseño */}
          {ot.archivo_diseno && (
            <div className="border border-[var(--border-default)] rounded-[8px] p-5">
              <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">Archivo de diseño</p>
              <a
                href={ot.archivo_diseno}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-[#7c3aed] hover:underline break-all"
              >
                {ot.archivo_diseno}
              </a>
            </div>
          )}

        </div>

        {/* ── Panel lateral ── */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-6 space-y-4">

          {/* Documentos */}
          <div className="border border-[var(--border-default)] rounded-[8px] p-5">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-3">Documentos</p>
            <a
              href={`/api/pdf/ot/${id}`}
              target="_blank"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-[var(--border-default)] text-[var(--text-primary)] rounded-[6px] hover:bg-[var(--bg-muted)] transition-colors"
            >
              Descargar PDF
            </a>
          </div>

          {/* Facturar */}
          <div className="border border-[var(--border-default)] rounded-[8px] p-5">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-3">Facturación</p>
            <Link
              href={`/facturas/nueva?ot_id=${id}`}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#09090b] hover:bg-[#3f3f46] text-white text-sm font-semibold rounded-[6px] transition-colors"
            >
              Crear factura
            </Link>
          </div>

          <div className="border border-[var(--border-default)] rounded-[8px] p-5">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-4">Producción</p>
            <AccionesOT
              id={id}
              estado={ot.estado as 'pendiente' | 'en_produccion' | 'terminado' | 'entregado'}
              maquinaId={ot.maquina_id ?? null}
              fechaEntrega={ot.fecha_entrega ?? null}
              notasProduccion={ot.notas_produccion ?? null}
              archivoDiseno={ot.archivo_diseno ?? null}
              maquinas={maquinas ?? []}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
