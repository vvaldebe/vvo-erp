import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import TablaClientes, { type ClienteRow } from '@/components/clientes/TablaClientes'

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, rut, email, telefono, nivel_precio, descuento_porcentaje, razon_social, nombre_fantasia, contactos(nombre, email, telefono, es_principal)')
    .order('nombre')

  if (error) {
    return (
      <div className="rounded-[8px] bg-red-50 border border-red-100 p-6 text-red-600 text-sm">
        Error al cargar clientes: {error.message}
      </div>
    )
  }

  const clientes: ClienteRow[] = (data ?? []).map((row) => {
    const contactosArr = Array.isArray(row.contactos) ? row.contactos : []
    const contactoPrincipal = contactosArr.find((c) => c.es_principal) ?? contactosArr[0] ?? null

    return {
      id:                   row.id,
      nombre:               row.nombre,
      rut:                  row.rut ?? null,
      email:                row.email ?? null,
      telefono:             row.telefono ?? null,
      nivel_precio:         row.nivel_precio as ClienteRow['nivel_precio'],
      descuento_porcentaje: row.descuento_porcentaje ?? 0,
      razon_social:         (row as { razon_social?: string | null }).razon_social ?? null,
      nombre_fantasia:      (row as { nombre_fantasia?: string | null }).nombre_fantasia ?? null,
      contacto_email:       contactoPrincipal?.email ?? row.email ?? null,
      contacto_telefono:    contactoPrincipal?.telefono ?? row.telefono ?? null,
    }
  })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Clientes</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="inline-flex items-center gap-1.5 px-3.5 h-8 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo cliente
        </Link>
      </div>

      {/* Tabla con buscador */}
      <TablaClientes clientes={clientes} />

    </div>
  )
}
