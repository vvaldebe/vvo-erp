import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Mail, Phone, MapPin, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import EstadoBadge from '@/components/shared/EstadoBadge'
import NivelPrecioBadge from '@/components/shared/NivelPrecioBadge'
import AccionesCotizacion from '@/components/cotizaciones/AccionesCotizacion'
import DatosPagoCotizacion from '@/components/cotizaciones/DatosPagoCotizacion'

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(n)
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default async function CotizacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cot, error: cotError } = await supabase
    .from('cotizaciones')
    .select(`
      id, numero, estado, nivel_precio, subtotal, iva, total,
      notas, asunto, created_at, valida_hasta, enviada_at,
      clientes ( id, nombre, rut, email, telefono, direccion, descuento_porcentaje )
    `)
    .eq('id', id)
    .single()

  // Datos bancarios y condiciones de pago desde configuración
  const CONFIG_PAGO_CLAVES = [
    'banco_nombre', 'banco_tipo_cuenta', 'banco_numero_cuenta',
    'banco_titular', 'banco_rut_titular', 'banco_email_transferencia',
    'condiciones_pago',
  ]
  const { data: configRows } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', CONFIG_PAGO_CLAVES)

  function cfgVal(clave: string) {
    return configRows?.find((r) => r.clave === clave)?.valor ?? null
  }

  const datosPago = {
    banco:              cfgVal('banco_nombre'),
    tipoCuenta:         cfgVal('banco_tipo_cuenta'),
    numeroCuenta:       cfgVal('banco_numero_cuenta'),
    titular:            cfgVal('banco_titular'),
    rutTitular:         cfgVal('banco_rut_titular'),
    emailTransferencia: cfgVal('banco_email_transferencia'),
    condicionesPago:    cfgVal('condiciones_pago'),
  }

  if (cotError || !cot) notFound()

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

  // Contactos del cliente (para selector en modal de envío)
  let contactos: { id: string; nombre: string; email: string | null; cargo: string | null; es_principal: boolean }[] = []
  let clienteEmail: string | null = clienteRaw?.email ?? null
  if (clienteRaw?.id) {
    const { data: contactosData } = await supabase
      .from('contactos')
      .select('id, nombre, email, cargo, es_principal')
      .eq('cliente_id', clienteRaw.id)
      .order('es_principal', { ascending: false })
    contactos = contactosData ?? []
    if (!clienteEmail) {
      clienteEmail = contactos.find((c) => c.es_principal)?.email ?? contactos[0]?.email ?? null
    }
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* Breadcrumb + acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/cotizaciones"
            className="flex items-center gap-1.5 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Cotizaciones
          </Link>
          <span className="text-[var(--text-faint)]">/</span>
          <span className="text-[14px] font-medium text-[var(--text-primary)]">{cot.numero}</span>
        </div>
        <AccionesCotizacion
          id={id}
          numero={cot.numero}
          estado={cot.estado}
          clienteNombre={clienteRaw?.nombre ?? ''}
          clienteEmail={clienteEmail}
          contactos={contactos}
          total={clp(cot.total)}
          validaHasta={fecha(cot.valida_hasta)}
          asunto={cot.asunto}
        />
      </div>

      {/* Header de la cotización */}
      <div className="flex items-start justify-between border border-[var(--border-default)] rounded-[8px] p-5">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-1">Cotización</p>
          <h1 className="text-[26px] font-semibold text-[var(--text-primary)]">{cot.numero}</h1>
          {cot.asunto && (
            <p className="text-[15px] font-medium text-[var(--text-secondary)] mt-1">{cot.asunto}</p>
          )}
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Emitida el {fecha(cot.created_at)}</p>
          {cot.enviada_at && (
            <p className="text-[12px] text-green-600 mt-0.5">
              ✓ Enviada el {new Date(cot.enviada_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las {new Date(cot.enviada_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <EstadoBadge estado={cot.estado} />
          <NivelPrecioBadge
            nivel={cot.nivel_precio as 'normal' | 'empresa' | 'agencia' | 'especial'}
            descuento={clienteRaw?.descuento_porcentaje ?? undefined}
          />
          {cot.valida_hasta && (
            <p className="text-[12px] text-[var(--text-muted)]">Válida hasta {fecha(cot.valida_hasta)}</p>
          )}
        </div>
      </div>

      {/* Cliente */}
      {clienteRaw && (
        <div className="border border-[var(--border-default)] rounded-[8px] p-5">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-3">Cliente</p>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <Link
                href={`/clientes/${clienteRaw.id}`}
                className="flex items-center gap-2 text-[16px] font-semibold text-[var(--text-primary)] hover:text-[#7c3aed] transition-colors"
              >
                <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                {clienteRaw.nombre}
              </Link>
              {clienteRaw.rut && (
                <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                  <Hash className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                  {clienteRaw.rut}
                </p>
              )}
              {clienteRaw.email && (
                <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                  <Mail className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                  {clienteRaw.email}
                </p>
              )}
              {clienteRaw.telefono && (
                <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                  <Phone className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                  {clienteRaw.telefono}
                </p>
              )}
              {clienteRaw.direccion && (
                <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                  <MapPin className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                  {clienteRaw.direccion}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabla ítems */}
      <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em]">Detalle de ítems</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
              <th className="text-left px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Descripción</th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Dimensiones</th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Cant.</th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Precio/u</th>
              <th className="text-right px-5 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => {
              const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
              const isM2 = prod?.unidad === 'm2' && item.ancho != null && item.alto != null
              const isMl = prod?.unidad === 'ml' && item.ancho != null
              const dims = isM2
                ? `${item.ancho!.toFixed(2)} × ${item.alto!.toFixed(2)} m²`
                : isMl
                ? `${item.ancho!.toFixed(2)} ml`
                : '—'
              const terminaciones = termsByItem[item.id] ?? []

              return (
                <>
                  <tr key={item.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-muted)] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-[14px] font-medium text-[var(--text-primary)]">{prod?.nombre ?? item.descripcion ?? 'Ítem'}</p>
                      {prod?.nombre && item.descripcion && (
                        <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{item.descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[14px] text-[var(--text-secondary)]">{dims}</td>
                    <td className="px-4 py-3.5 text-right text-[14px] text-[var(--text-primary)] tabular-nums">{item.cantidad}</td>
                    <td className="px-4 py-3.5 text-right text-[14px] text-[var(--text-primary)] tabular-nums">{clp(item.precio_unitario)}</td>
                    <td className="px-5 py-3.5 text-right text-[14px] font-semibold text-[var(--text-primary)] tabular-nums">{clp(item.subtotal)}</td>
                  </tr>
                  {terminaciones.map((t, j) => (
                    <tr key={`${item.id}-t${j}`} className="border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]">
                      <td className="px-5 py-2 pl-10 text-[12px] text-[var(--text-secondary)]">+ {t.nombre}</td>
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 text-right text-[12px] text-[var(--text-secondary)] tabular-nums">{t.cantidad}</td>
                      <td className="px-4 py-2 text-right text-[12px] text-[var(--text-secondary)] tabular-nums">{clp(t.precio)}</td>
                      <td className="px-5 py-2 text-right text-[12px] text-[var(--text-secondary)] tabular-nums">{clp(t.precio * t.cantidad)}</td>
                    </tr>
                  ))}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="flex justify-end">
        <div className="w-72 border border-[var(--border-default)] rounded-[8px] overflow-hidden">
          <div className="px-5 py-3 flex justify-between text-[14px] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
            <span>Subtotal neto</span>
            <span className="tabular-nums">{clp(cot.subtotal)}</span>
          </div>
          <div className="px-5 py-3 flex justify-between text-[14px] text-[var(--text-secondary)] border-b border-[var(--border-default)]">
            <span>IVA 19%</span>
            <span className="tabular-nums">{clp(cot.iva)}</span>
          </div>
          <div className="px-5 py-4 flex justify-between bg-[var(--bg-muted)]">
            <span className="text-[16px] font-semibold text-[var(--text-primary)]">Total</span>
            <span className="text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">{clp(cot.total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {cot.notas && (
        <div className="border border-[var(--border-default)] rounded-[8px] p-5">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">Notas</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{cot.notas}</p>
        </div>
      )}

      {/* Datos de pago */}
      <DatosPagoCotizacion
        cotizacionId={id}
        datosBancarios={{
          banco:              datosPago.banco ?? undefined,
          tipoCuenta:         datosPago.tipoCuenta ?? undefined,
          numeroCuenta:       datosPago.numeroCuenta ?? undefined,
          titular:            datosPago.titular ?? undefined,
          rutTitular:         datosPago.rutTitular ?? undefined,
          emailTransferencia: datosPago.emailTransferencia ?? undefined,
        }}
        condicionesPago={datosPago.condicionesPago ?? undefined}
      />

      <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
        Precios netos, no incluyen IVA. Validez según fecha indicada. Sujeto a disponibilidad de materiales.
      </p>

    </div>
  )
}
