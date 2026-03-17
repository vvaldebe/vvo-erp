import { createClient } from '@/lib/supabase/server'
import TablaTerminaciones from '@/components/admin/TablaTerminaciones'
import type { Terminacion } from '@/types/database.types'

export default async function AdminTerminacionesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('terminaciones')
    .select('id, nombre, unidad, precio, activo')
    .order('nombre')

  if (error) {
    return (
      <div className="rounded-[8px] bg-red-50 border border-red-100 p-6 text-red-600 text-sm">
        Error al cargar terminaciones: {error.message}
      </div>
    )
  }

  const terminaciones: Terminacion[] = (data ?? []).map((row) => ({
    id:     row.id,
    nombre: row.nombre,
    unidad: row.unidad as Terminacion['unidad'],
    precio: row.precio,
    activo: row.activo,
  }))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)]">Terminaciones</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Acabados y terminaciones disponibles para cotizaciones
          </p>
        </div>
      </div>

      <TablaTerminaciones terminaciones={terminaciones} />
    </div>
  )
}
