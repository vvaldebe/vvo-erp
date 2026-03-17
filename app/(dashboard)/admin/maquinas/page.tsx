import { createClient } from '@/lib/supabase/server'
import TablaMaquinas from '@/components/admin/TablaMaquinas'

export default async function AdminMaquinasPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('maquinas')
    .select('id, nombre, descripcion, activo')
    .order('nombre')

  if (error) {
    return (
      <div className="rounded-[8px] bg-red-50 border border-red-100 p-6 text-red-600 text-sm">
        Error al cargar máquinas: {error.message}
      </div>
    )
  }

  const maquinas = (data ?? []).map((row) => ({
    id:          row.id,
    nombre:      row.nombre,
    descripcion: row.descripcion ?? null,
    activo:      row.activo ?? true,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-[var(--text-primary)]">Máquinas</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Equipos disponibles para asignar a órdenes de trabajo
        </p>
      </div>

      <TablaMaquinas maquinas={maquinas} />
    </div>
  )
}
