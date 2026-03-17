import Link from 'next/link'
import { Plus, Package, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ToggleActivoProducto from '@/components/admin/ToggleActivoProducto'

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

interface ProductoConCategoria {
  id: string
  nombre: string
  unidad: string
  precio_normal: number
  precio_empresa: number
  precio_agencia: number
  costo_base: number
  activo: boolean
  categoria_nombre: string | null
  categoria_orden: number
}

export default async function AdminProductosPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('productos')
    .select(`
      id,
      nombre,
      unidad,
      precio_normal,
      precio_empresa,
      precio_agencia,
      costo_base,
      activo,
      categorias ( nombre, orden )
    `)
    .order('nombre')

  if (error) {
    return (
      <div className="rounded-[8px] bg-red-50 border border-red-100 p-6 text-red-600 text-sm">
        Error al cargar productos: {error.message}
      </div>
    )
  }

  type RawRow = NonNullable<typeof data>[number]
  function getCatNombre(cat: RawRow['categorias']): string | null {
    if (!cat) return null
    if (Array.isArray(cat)) return (cat as { nombre: string }[])[0]?.nombre ?? null
    return (cat as { nombre: string }).nombre ?? null
  }
  function getCatOrden(cat: RawRow['categorias']): number {
    if (!cat) return 9999
    if (Array.isArray(cat)) return (cat as { orden: number }[])[0]?.orden ?? 9999
    return (cat as { orden: number }).orden ?? 9999
  }

  const productos: ProductoConCategoria[] = (data ?? []).map((row) => ({
    id:               row.id,
    nombre:           row.nombre,
    unidad:           row.unidad,
    precio_normal:    row.precio_normal,
    precio_empresa:   row.precio_empresa,
    precio_agencia:   row.precio_agencia,
    costo_base:       row.costo_base,
    activo:           row.activo,
    categoria_nombre: getCatNombre(row.categorias),
    categoria_orden:  getCatOrden(row.categorias),
  }))

  // Ordenar por categoría.orden, luego nombre
  productos.sort((a, b) => {
    if (a.categoria_orden !== b.categoria_orden) return a.categoria_orden - b.categoria_orden
    return a.nombre.localeCompare(b.nombre)
  })

  // Agrupar por categoría
  const grupos: { categoria: string; items: ProductoConCategoria[] }[] = []
  for (const p of productos) {
    const catLabel = p.categoria_nombre ?? 'Sin categoría'
    const grupo = grupos.find((g) => g.categoria === catLabel)
    if (grupo) {
      grupo.items.push(p)
    } else {
      grupos.push({ categoria: catLabel, items: [p] })
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Productos</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            {productos.length} producto{productos.length !== 1 ? 's' : ''} registrado{productos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-1.5 px-3.5 h-8 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo producto
        </Link>
      </div>

      {/* Tabla */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
                <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Unidad</th>
                <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Normal</th>
                <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Empresa</th>
                <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Agencia</th>
                <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Costo</th>
                <th className="text-center px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Activo</th>
                <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                      <Package className="w-8 h-8 opacity-25" />
                      <p className="text-[13px]">No hay productos aún</p>
                      <p className="text-[12px] text-[var(--text-faint)]">Crea el primer producto con el botón de arriba</p>
                    </div>
                  </td>
                </tr>
              ) : (
                grupos.map((grupo) => (
                  <>
                    <tr key={`cat-${grupo.categoria}`} className="bg-[var(--bg-muted)] border-b border-t border-[var(--border-subtle)]">
                      <td colSpan={8} className="px-4 py-2">
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.08em]">
                          {grupo.categoria}
                        </span>
                      </td>
                    </tr>
                    {grupo.items.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-muted)] transition-colors"
                      >
                        <td className="px-4 h-11 text-[13px] font-medium text-[var(--text-primary)]">{p.nombre}</td>
                        <td className="px-4 h-11">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium bg-[#f4f4f5] text-[var(--text-secondary)]">
                            {p.unidad}
                          </span>
                        </td>
                        <td className="px-4 h-11 text-right text-[14px] tabular-nums text-[var(--text-primary)]">
                          {formatCLP(p.precio_normal)}
                        </td>
                        <td className="px-4 h-11 text-right text-[14px] tabular-nums text-[var(--text-primary)]">
                          {formatCLP(p.precio_empresa)}
                        </td>
                        <td className="px-4 h-11 text-right text-[14px] tabular-nums text-[var(--text-primary)]">
                          {formatCLP(p.precio_agencia)}
                        </td>
                        <td className="px-4 h-11 text-right text-[14px] tabular-nums text-[var(--text-secondary)]">
                          {formatCLP(p.costo_base)}
                        </td>
                        <td className="px-4 h-11 text-center">
                          <ToggleActivoProducto id={p.id} activo={p.activo} />
                        </td>
                        <td className="px-4 h-11 text-right">
                          <Link
                            href={`/admin/productos/${p.id}`}
                            className="inline-flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-[5px] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
