import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductoForm from '@/components/admin/ProductoForm'
import type { Producto } from '@/types/database.types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: prodData, error },
    { data: categoriasData },
    { data: materiales },
    { data: configRows },
  ] = await Promise.all([
    supabase.from('productos').select('*').eq('id', id).single(),
    supabase.from('categorias').select('id, nombre, orden').order('orden'),
    supabase.from('materiales').select('id, nombre, tipo, costo_m2').eq('activo', true).order('tipo').order('nombre'),
    supabase.from('configuracion').select('clave, valor').in('clave', ['costo_tinta_m2', 'overhead_m2']),
  ])

  if (error || !prodData) {
    notFound()
  }

  const producto: Producto = {
    id:                      prodData.id,
    nombre:                  prodData.nombre,
    categoria_id:            prodData.categoria_id ?? undefined,
    unidad:                  prodData.unidad as Producto['unidad'],
    precio_normal:           prodData.precio_normal,
    precio_empresa:          prodData.precio_empresa,
    precio_agencia:          prodData.precio_agencia,
    costo_base:              prodData.costo_base,
    costo_material:          prodData.costo_material ?? 0,
    costo_tinta:             prodData.costo_tinta ?? 0,
    costo_soporte:           prodData.costo_soporte ?? 0,
    costo_otros:             prodData.costo_otros ?? 0,
    costo_overhead:          prodData.costo_overhead ?? 0,
    tiene_tinta:             prodData.tiene_tinta ?? true,
    cliente_lleva_material:  prodData.cliente_lleva_material ?? false,
    activo:                  prodData.activo,
    created_at:              prodData.created_at,
  }

  const categorias = (categoriasData ?? []).map((c) => ({
    id:     c.id as string,
    nombre: c.nombre as string,
  }))

  const costoTintaGlobal = Number(configRows?.find(r => r.clave === 'costo_tinta_m2')?.valor ?? 2500)
  const overheadGlobal   = Number(configRows?.find(r => r.clave === 'overhead_m2')?.valor ?? 1800)

  return (
    <div className="max-w-2xl space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/productos"
          className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)]">Editar producto</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{producto.nombre}</p>
        </div>
      </div>

      <ProductoForm
        producto={producto}
        categorias={categorias}
        materiales={materiales ?? []}
        costoTintaGlobal={costoTintaGlobal}
        overheadGlobal={overheadGlobal}
        materialId={prodData.material_id ?? null}
      />
    </div>
  )
}
