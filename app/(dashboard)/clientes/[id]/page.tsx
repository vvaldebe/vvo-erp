import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Globe, MapPin, Building2, Star, Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NivelPrecioBadge from '@/components/shared/NivelPrecioBadge'
import ClienteDetailTabs from '@/components/clientes/ClienteDetailTabs'
import type { Cliente, Contacto, Cotizacion, OrdenTrabajo, Factura } from '@/types/database.types'

interface Props {
  params: Promise<{ id: string }>
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    clienteResult,
    contactosResult,
    cotizacionesResult,
    otsResult,
    facturasResult,
  ] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('contactos').select('*').eq('cliente_id', id).order('es_principal', { ascending: false }).order('created_at'),
    supabase.from('cotizaciones').select('id, numero, estado, total, created_at').eq('cliente_id', id).order('created_at', { ascending: false }),
    supabase.from('ordenes_trabajo').select('id, numero, estado, total, fecha_entrega').eq('cliente_id', id).order('created_at', { ascending: false }),
    supabase.from('facturas').select('id, numero_sii, estado, total, fecha_emision, fecha_vencimiento').eq('cliente_id', id).order('fecha_emision', { ascending: false }),
  ])

  if (clienteResult.error || !clienteResult.data) {
    notFound()
  }

  const data = clienteResult.data

  const cliente: Cliente = {
    id:                   data.id,
    nombre:               data.nombre,
    rut:                  data.rut ?? undefined,
    email:                data.email ?? undefined,
    telefono:             data.telefono ?? undefined,
    direccion:            data.direccion ?? undefined,
    nivel_precio:         data.nivel_precio as Cliente['nivel_precio'],
    descuento_porcentaje: data.descuento_porcentaje ?? 0,
    canal_origen:         data.canal_origen ?? undefined,
    notas:                data.notas ?? undefined,
    activo:               data.activo,
    created_at:           data.created_at,
    razon_social:         data.razon_social ?? undefined,
    nombre_fantasia:      data.nombre_fantasia ?? undefined,
    giro:                 data.giro ?? undefined,
    direccion_fiscal:     data.direccion_fiscal ?? undefined,
    comuna:               data.comuna ?? undefined,
    ciudad:               data.ciudad ?? undefined,
    sitio_web:            data.sitio_web ?? undefined,
  }

  const contactos: Contacto[] = (contactosResult.data ?? []).map((c) => ({
    id:           c.id,
    cliente_id:   c.cliente_id,
    nombre:       c.nombre,
    cargo:        c.cargo ?? undefined,
    email:        c.email ?? undefined,
    telefono:     c.telefono ?? undefined,
    es_principal: c.es_principal ?? false,
    created_at:   c.created_at,
  }))

  const cotizaciones = (cotizacionesResult.data ?? []) as Pick<Cotizacion, 'id' | 'numero' | 'estado' | 'total' | 'created_at'>[]
  const ots          = (otsResult.data ?? []) as Pick<OrdenTrabajo, 'id' | 'numero' | 'estado' | 'total' | 'fecha_entrega'>[]
  const facturas     = (facturasResult.data ?? []) as (Pick<Factura, 'id' | 'numero_sii' | 'estado' | 'total' | 'fecha_emision'> & { fecha_vencimiento?: string | null })[]

  // Estado de cuenta
  const totalAdeudado = facturas
    .filter((f) => f.estado === 'pendiente' || f.estado === 'vencida')
    .reduce((acc, f) => acc + (f.total ?? 0), 0)
  const cotizacionesPendientes = cotizaciones.filter((c) => c.estado === 'enviada' || c.estado === 'borrador')
  const otsActivas = ots.filter((o) => o.estado === 'pendiente' || o.estado === 'en_produccion')
  const facturasPendientes = facturas.filter((f) => f.estado === 'pendiente' || f.estado === 'vencida')

  const displayName = cliente.razon_social ?? cliente.nombre
  const showFantasia = cliente.nombre_fantasia && cliente.nombre_fantasia !== cliente.razon_social

  return (
    <div className="-m-4 md:-m-8 flex flex-col md:flex-row md:h-[calc(100vh-48px)]">

      {/* ── Left panel ──────────────────────────────────────────── */}
      <aside className="w-full md:w-[320px] md:shrink-0 border-b md:border-b-0 md:border-r border-[var(--border-default)] bg-[var(--bg-card)] flex flex-col md:overflow-y-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border-default)] shrink-0">
          <Link
            href="/clientes"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Clientes
          </Link>
          <Link
            href={`/clientes/${id}/editar`}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[12px] font-medium border border-[var(--border-default)] text-[var(--text-secondary)] rounded-[5px] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </Link>
        </div>

        {/* Client header */}
        <div className="px-4 py-5 border-b border-[var(--border-subtle)] space-y-1.5">
          <h1 className="text-[17px] font-bold text-[var(--text-primary)] leading-tight">{displayName}</h1>
          {showFantasia && (
            <p className="text-[13px] text-[var(--text-secondary)]">{cliente.nombre_fantasia}</p>
          )}
          {cliente.rut && (
            <p className="text-[12px] text-[var(--text-muted)] font-mono">{cliente.rut}</p>
          )}
          <div className="pt-1">
            <NivelPrecioBadge
              nivel={cliente.nivel_precio}
              descuento={cliente.descuento_porcentaje}
            />
          </div>
        </div>

        {/* Contacts */}
        {contactos.length > 0 && (
          <div className="px-4 py-4 border-b border-[var(--border-subtle)] space-y-3">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Contactos</p>
            <div className="space-y-3">
              {contactos.map((c) => (
                <div key={c.id} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{c.nombre}</span>
                    {c.es_principal && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] bg-[#7c3aed]/10 text-[10px] font-medium text-[#7c3aed]">
                        <Star className="w-2.5 h-2.5 fill-[#7c3aed]" />
                        Principal
                      </span>
                    )}
                  </div>
                  {c.cargo && (
                    <p className="text-[11px] text-[var(--text-muted)]">{c.cargo}</p>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                      <Mail className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
                      {c.email}
                    </div>
                  )}
                  {c.telefono && (
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                      <Phone className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />
                      {c.telefono}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="px-4 py-4 border-b border-[var(--border-subtle)] space-y-3">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Detalles</p>
          <div className="space-y-2.5 text-[12px]">
            {cliente.giro && (
              <div className="flex items-start gap-2">
                <Building2 className="w-3.5 h-3.5 mt-0.5 text-[var(--text-muted)] shrink-0" />
                <span className="text-[var(--text-secondary)]">{cliente.giro}</span>
              </div>
            )}
            {cliente.canal_origen && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">Canal:</span>
                <span className="text-[var(--text-secondary)]">{cliente.canal_origen}</span>
              </div>
            )}
            {cliente.sitio_web && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <a
                  href={cliente.sitio_web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7c3aed] hover:underline truncate"
                >
                  {cliente.sitio_web.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        {(cliente.direccion_fiscal || cliente.comuna || cliente.ciudad) && (
          <div className="px-4 py-4 border-b border-[var(--border-subtle)] space-y-3">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Dirección</p>
            <div className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-[var(--text-muted)] shrink-0" />
              <div className="space-y-0.5">
                {cliente.direccion_fiscal && <p>{cliente.direccion_fiscal}</p>}
                {(cliente.comuna || cliente.ciudad) && (
                  <p>{[cliente.comuna, cliente.ciudad].filter(Boolean).join(', ')}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {cliente.notas && (
          <div className="px-4 py-4 border-b border-[var(--border-subtle)] space-y-2">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Notas internas</p>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{cliente.notas}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-4 mt-auto">
          <p className="text-[11px] text-[var(--text-muted)]">
            Cliente desde {formatDate(cliente.created_at)}
          </p>
        </div>
      </aside>

      {/* ── Right panel ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 md:overflow-y-auto bg-[var(--bg-page)]">
        <ClienteDetailTabs
          cotizaciones={cotizaciones}
          ots={ots}
          facturas={facturas}
          totalAdeudado={totalAdeudado}
          cotizacionesPendientes={cotizacionesPendientes}
          otsActivas={otsActivas}
          facturasPendientes={facturasPendientes}
        />
      </div>
    </div>
  )
}
