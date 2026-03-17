import { createClient } from '@/lib/supabase/server'
import TablaServiciosMaquina from '@/components/admin/TablaServiciosMaquina'

export default async function AdminServiciosMaquinaPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('servicios_maquina')
    .select('id, nombre, tipo, precio_minuto_normal, precio_minuto_empresa, precio_minuto_agencia, minimo_minutos, descripcion, activo')
    .order('tipo')
    .order('nombre')

  if (error) {
    return (
      <div className="rounded-[8px] bg-red-50 border border-red-100 p-6 text-red-600 text-sm">
        Error al cargar servicios de máquina: {error.message}
      </div>
    )
  }

  const servicios = (data ?? []).map((row) => ({
    id:                    row.id,
    nombre:                row.nombre,
    tipo:                  row.tipo,
    precio_minuto_normal:  row.precio_minuto_normal ?? 0,
    precio_minuto_empresa: row.precio_minuto_empresa ?? 0,
    precio_minuto_agencia: row.precio_minuto_agencia ?? 0,
    minimo_minutos:        row.minimo_minutos ?? 1,
    descripcion:           row.descripcion ?? null,
    activo:                row.activo ?? true,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-[var(--text-primary)]">Servicios de máquina</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Precios por minuto para láser, CNC y otros equipos
        </p>
      </div>

      <TablaServiciosMaquina servicios={servicios} />
    </div>
  )
}
