import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductoForm from '@/components/admin/ProductoForm'

export default async function NuevoProductoPage() {
  const supabase = await createClient()

  const [{ data: categoriasData }, { data: materiales }, { data: configRows }] = await Promise.all([
    supabase.from('categorias').select('id, nombre, orden').order('orden'),
    supabase.from('materiales').select('id, nombre, tipo, costo_m2').eq('activo', true).order('tipo').order('nombre'),
    supabase.from('configuracion').select('clave, valor').in('clave', ['costo_tinta_m2', 'overhead_m2']),
  ])

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
          <h1 className="text-xl font-black text-[var(--text-primary)]">Nuevo producto</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Completa los datos del producto</p>
        </div>
      </div>

      <ProductoForm
        categorias={categorias}
        materiales={materiales ?? []}
        costoTintaGlobal={costoTintaGlobal}
        overheadGlobal={overheadGlobal}
      />
    </div>
  )
}
