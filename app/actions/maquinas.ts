'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const maquinaSchema = z.object({
  nombre:      z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional().nullable(),
})

type Result = { error: string } | { success: true }

export async function crearMaquina(data: { nombre: string; descripcion?: string | null }): Promise<Result> {
  const parsed = maquinaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('maquinas').insert({
    nombre:      parsed.data.nombre,
    descripcion: parsed.data.descripcion || null,
    activo:      true,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/maquinas')
  return { success: true }
}

export async function actualizarMaquina(id: string, data: { nombre: string; descripcion?: string | null }): Promise<Result> {
  const parsed = maquinaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('maquinas').update({
    nombre:      parsed.data.nombre,
    descripcion: parsed.data.descripcion || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/maquinas')
  return { success: true }
}

export async function toggleActivaMaquina(id: string, activo: boolean): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('maquinas').update({ activo }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/maquinas')
  return { success: true }
}
