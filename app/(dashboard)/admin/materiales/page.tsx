import { createClient } from '@/lib/supabase/server'
import TablaMateriales from '@/components/admin/TablaMateriales'

export default async function AdminMaterialesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('materiales')
    .select('id, nombre, tipo, costo_m2, unidad, activo')
    .order('tipo', { nullsFirst: false })
    .order('nombre')

  if (error) {
    return (
      <div className="rounded-[8px] bg-red-50 border border-red-100 p-6 text-red-600 text-sm">
        Error al cargar materiales: {error.message}
      </div>
    )
  }

  const materiales = (data ?? []).map((row) => ({
    id:       row.id,
    nombre:   row.nombre,
    tipo:     row.tipo ?? null,
    costo_m2: row.costo_m2 ?? 0,
    unidad:   row.unidad ?? 'm2',
    activo:   row.activo ?? true,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-[var(--text-primary)]">Materiales</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Materiales base con costos para cálculos internos de margen
        </p>
      </div>

      <TablaMateriales materiales={materiales} />
    </div>
  )
}
