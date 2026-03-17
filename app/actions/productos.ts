'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const productoSchema = z.object({
  nombre:                  z.string().min(1, 'El nombre es requerido'),
  categoria_id:            z.string().uuid('Categoría inválida').optional().nullable(),
  unidad:                  z.enum(['m2', 'ml', 'unidad']),
  precio_normal:           z.number().min(0, 'Precio inválido'),
  precio_empresa:          z.number().min(0, 'Precio inválido'),
  precio_agencia:          z.number().min(0, 'Precio inválido'),
  costo_base:              z.number().min(0, 'Costo inválido'),
  // Desglose de costos
  material_id:             z.string().uuid().optional().nullable(),
  costo_material:          z.number().min(0).default(0),
  costo_tinta:             z.number().min(0).default(0),
  costo_soporte:           z.number().min(0).default(0),
  costo_otros:             z.number().min(0).default(0),
  costo_overhead:          z.number().min(0).default(0),
  tiene_tinta:             z.boolean().default(true),
  cliente_lleva_material:  z.boolean().default(false),
})

export type ProductoFormData = z.infer<typeof productoSchema>
export type ProductoActionResult = { error: string } | { success: true; id: string }

export async function crearProducto(data: ProductoFormData): Promise<ProductoActionResult> {
  const parsed = productoSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('productos')
    .insert({
      nombre:                  parsed.data.nombre,
      categoria_id:            parsed.data.categoria_id ?? null,
      unidad:                  parsed.data.unidad,
      precio_normal:           parsed.data.precio_normal,
      precio_empresa:          parsed.data.precio_empresa,
      precio_agencia:          parsed.data.precio_agencia,
      costo_base:              parsed.data.costo_base,
      material_id:             parsed.data.material_id ?? null,
      costo_material:          parsed.data.costo_material,
      costo_tinta:             parsed.data.costo_tinta,
      costo_soporte:           parsed.data.costo_soporte,
      costo_otros:             parsed.data.costo_otros,
      costo_overhead:          parsed.data.costo_overhead,
      tiene_tinta:             parsed.data.tiene_tinta,
      cliente_lleva_material:  parsed.data.cliente_lleva_material,
      activo:                  true,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  return { success: true, id: row.id }
}

export async function actualizarProducto(
  id: string,
  data: ProductoFormData
): Promise<ProductoActionResult> {
  const parsed = productoSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('productos')
    .update({
      nombre:                  parsed.data.nombre,
      categoria_id:            parsed.data.categoria_id ?? null,
      unidad:                  parsed.data.unidad,
      precio_normal:           parsed.data.precio_normal,
      precio_empresa:          parsed.data.precio_empresa,
      precio_agencia:          parsed.data.precio_agencia,
      costo_base:              parsed.data.costo_base,
      material_id:             parsed.data.material_id ?? null,
      costo_material:          parsed.data.costo_material,
      costo_tinta:             parsed.data.costo_tinta,
      costo_soporte:           parsed.data.costo_soporte,
      costo_otros:             parsed.data.costo_otros,
      costo_overhead:          parsed.data.costo_overhead,
      tiene_tinta:             parsed.data.tiene_tinta,
      cliente_lleva_material:  parsed.data.cliente_lleva_material,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  revalidatePath(`/admin/productos/${id}`)
  return { success: true, id }
}

export async function toggleActivo(id: string, activo: boolean): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('productos')
    .update({ activo })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  return {}
}
