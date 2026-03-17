import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ClienteForm from '@/components/clientes/ClienteForm'
import type { Cliente, Contacto } from '@/types/database.types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [clienteResult, contactosResult] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('contactos').select('*').eq('cliente_id', id).order('created_at'),
  ])

  if (clienteResult.error || !clienteResult.data) {
    notFound()
  }

  const data = clienteResult.data

  const cliente: Cliente & { contactos: Contacto[] } = {
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
    contactos:            (contactosResult.data ?? []).map((c) => ({
      id:           c.id,
      cliente_id:   c.cliente_id,
      nombre:       c.nombre,
      cargo:        c.cargo ?? undefined,
      email:        c.email ?? undefined,
      telefono:     c.telefono ?? undefined,
      es_principal: c.es_principal ?? false,
      created_at:   c.created_at,
    })),
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/clientes/${id}`}
          className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)]">Editar cliente</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {cliente.razon_social ?? cliente.nombre}
          </p>
        </div>
      </div>

      <ClienteForm cliente={cliente} />
    </div>
  )
}
