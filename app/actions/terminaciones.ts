'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const terminacionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  unidad: z.enum(['m2', 'ml', 'unidad']),
  precio: z.number().min(0, 'Precio inválido'),
})

export type TerminacionFormData = z.infer<typeof terminacionSchema>
export type TerminacionActionResult = { error: string } | { success: true; id: string }

export async function crearTerminacion(data: TerminacionFormData): Promise<TerminacionActionResult> {
  const parsed = terminacionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('terminaciones')
    .insert({
      nombre: parsed.data.nombre,
      unidad: parsed.data.unidad,
      precio: parsed.data.precio,
      activo: true,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/terminaciones')
  return { success: true, id: row.id }
}

export async function actualizarTerminacion(
  id: string,
  data: TerminacionFormData
): Promise<TerminacionActionResult> {
  const parsed = terminacionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('terminaciones')
    .update({
      nombre: parsed.data.nombre,
      unidad: parsed.data.unidad,
      precio: parsed.data.precio,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/terminaciones')
  return { success: true, id }
}

export async function toggleActivaTerminacion(
  id: string,
  activo: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('terminaciones')
    .update({ activo })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/terminaciones')
  return {}
}
