import { createClient } from '@/lib/supabase/server'
import PlantillasAdmin from '@/components/admin/PlantillasAdmin'
import type { Producto } from '@/types/database.types'

export default async function AdminPlantillasPage() {
  const supabase = await createClient()

  const [{ data: plantillasData }, { data: productosData }] = await Promise.all([
    supabase
      .from('plantillas_cotizacion')
      .select(`
        id, nombre, descripcion, activo,
        plantilla_items ( id, producto_id, descripcion, ancho, alto, cantidad, orden )
      `)
      .order('nombre'),
    supabase
      .from('productos')
      .select('id, nombre, categoria_id, unidad, precio_normal, precio_empresa, precio_agencia, activo')
      .eq('activo', true)
      .order('nombre'),
  ])

  type RawPlantillaItem = {
    id: string
    producto_id: string | null
    descripcion: string | null
    ancho: number | null
    alto: number | null
    cantidad: number
    orden: number
  }

  const plantillas = (plantillasData ?? []).map((p) => {
    const items: RawPlantillaItem[] = Array.isArray(p.plantilla_items) ? p.plantilla_items : []
    return {
      id:          p.id,
      nombre:      p.nombre,
      descripcion: p.descripcion ?? null,
      activo:      p.activo,
      items:       items
        .map((i) => ({
          id:          i.id,
          producto_id: i.producto_id ?? null,
          descripcion: i.descripcion ?? null,
          ancho:       i.ancho ?? null,
          alto:        i.alto ?? null,
          cantidad:    i.cantidad,
          orden:       i.orden,
        }))
        .sort((a, b) => a.orden - b.orden),
    }
  })

  const productos: Pick<Producto, 'id' | 'nombre'>[] = (productosData ?? []).map((p) => ({
    id:     p.id,
    nombre: p.nombre,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Plantillas de cotización</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          Plantillas reutilizables para crear cotizaciones más rápido.
        </p>
      </div>

      <PlantillasAdmin plantillas={plantillas} productos={productos} />
    </div>
  )
}
