'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlantillaItem {
  id:          string
  producto_id: string | null
  descripcion: string | null
  ancho:       number | null
  alto:        number | null
  cantidad:    number
  orden:       number
}

export interface Plantilla {
  id:          string
  nombre:      string
  descripcion: string | null
  activo:      boolean
  items:       PlantillaItem[]
}

// ── Fetch plantillas ─────────────────────────────────────────────────────────

export async function getPlantillas(): Promise<Plantilla[]> {
  const supabase = await createClient()

  const { data: plantillas, error } = await supabase
    .from('plantillas_cotizacion')
    .select(`
      id, nombre, descripcion, activo,
      plantilla_items ( id, producto_id, descripcion, ancho, alto, cantidad, orden )
    `)
    .eq('activo', true)
    .order('nombre')

  if (error) return []

  return (plantillas ?? []).map((p) => {
    const items = Array.isArray(p.plantilla_items) ? p.plantilla_items : []
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
}

// ── Schema ───────────────────────────────────────────────────────────────────

const plantillaItemSchema = z.object({
  producto_id: z.string().uuid().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  ancho:       z.number().min(0).optional().nullable(),
  alto:        z.number().min(0).optional().nullable(),
  cantidad:    z.number().int().min(1).default(1),
  orden:       z.number().int().min(0).default(0),
})

const plantillaSchema = z.object({
  nombre:      z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional().nullable(),
  items:       z.array(plantillaItemSchema).default([]),
})

export type PlantillaFormData  = z.infer<typeof plantillaSchema>
export type PlantillaActionResult = { error: string } | { success: true; id: string }

// ── Crear plantilla ──────────────────────────────────────────────────────────

export async function crearPlantilla(data: PlantillaFormData): Promise<PlantillaActionResult> {
  const parsed = plantillaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('plantillas_cotizacion')
    .insert({ nombre: parsed.data.nombre, descripcion: parsed.data.descripcion ?? null })
    .select('id')
    .single()

  if (error || !row) return { error: error?.message ?? 'Error al crear plantilla' }

  if (parsed.data.items.length > 0) {
    const { error: itemsError } = await supabase.from('plantilla_items').insert(
      parsed.data.items.map((item, idx) => ({
        plantilla_id: row.id,
        producto_id:  item.producto_id ?? null,
        descripcion:  item.descripcion ?? null,
        ancho:        item.ancho ?? null,
        alto:         item.alto ?? null,
        cantidad:     item.cantidad,
        orden:        item.orden ?? idx,
      }))
    )
    if (itemsError) return { error: itemsError.message }
  }

  revalidatePath('/admin/plantillas')
  return { success: true, id: row.id }
}

// ── Actualizar plantilla ─────────────────────────────────────────────────────

export async function actualizarPlantilla(
  id: string,
  data: PlantillaFormData
): Promise<PlantillaActionResult> {
  const parsed = plantillaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('plantillas_cotizacion')
    .update({ nombre: parsed.data.nombre, descripcion: parsed.data.descripcion ?? null })
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  // Replace items
  await supabase.from('plantilla_items').delete().eq('plantilla_id', id)

  if (parsed.data.items.length > 0) {
    const { error: itemsError } = await supabase.from('plantilla_items').insert(
      parsed.data.items.map((item, idx) => ({
        plantilla_id: id,
        producto_id:  item.producto_id ?? null,
        descripcion:  item.descripcion ?? null,
        ancho:        item.ancho ?? null,
        alto:         item.alto ?? null,
        cantidad:     item.cantidad,
        orden:        item.orden ?? idx,
      }))
    )
    if (itemsError) return { error: itemsError.message }
  }

  revalidatePath('/admin/plantillas')
  return { success: true, id }
}

// ── Eliminar plantilla ───────────────────────────────────────────────────────

export async function eliminarPlantilla(id: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase.from('plantillas_cotizacion').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/plantillas')
  return { success: true }
}
