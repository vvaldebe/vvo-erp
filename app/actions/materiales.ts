'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TIPOS = ['tela', 'rigido', 'adhesivo', 'papel', 'cnc_laser', 'otro'] as const
const UNIDADES = ['m2', 'ml', 'unidad'] as const

const materialSchema = z.object({
  nombre:   z.string().min(1, 'El nombre es requerido'),
  tipo:     z.enum(TIPOS).optional().nullable(),
  costo_m2: z.number().min(0, 'El costo no puede ser negativo'),
  unidad:   z.enum(UNIDADES),
})

type MaterialInput = {
  nombre: string
  tipo?: (typeof TIPOS)[number] | null
  costo_m2: number
  unidad: (typeof UNIDADES)[number]
}

type Result = { error: string } | { success: true }

export async function crearMaterial(data: MaterialInput): Promise<Result> {
  const parsed = materialSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('materiales').insert({
    nombre:   parsed.data.nombre,
    tipo:     parsed.data.tipo ?? null,
    costo_m2: parsed.data.costo_m2,
    unidad:   parsed.data.unidad,
    activo:   true,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/materiales')
  return { success: true }
}

export async function actualizarMaterial(id: string, data: MaterialInput): Promise<Result> {
  const parsed = materialSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('materiales').update({
    nombre:   parsed.data.nombre,
    tipo:     parsed.data.tipo ?? null,
    costo_m2: parsed.data.costo_m2,
    unidad:   parsed.data.unidad,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/materiales')
  return { success: true }
}

export async function toggleActivoMaterial(id: string, activo: boolean): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('materiales').update({ activo }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/materiales')
  return { success: true }
}
