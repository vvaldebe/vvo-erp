'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TIPOS = ['laser', 'cnc', 'plotter_corte', 'plotter_impresion', 'laminadora', 'otro'] as const

const servicioSchema = z.object({
  nombre:                 z.string().min(1, 'El nombre es requerido'),
  tipo:                   z.enum(TIPOS),
  precio_minuto_normal:   z.number().min(0, 'El precio no puede ser negativo'),
  precio_minuto_empresa:  z.number().min(0, 'El precio no puede ser negativo'),
  precio_minuto_agencia:  z.number().min(0, 'El precio no puede ser negativo'),
  minimo_minutos:         z.number().int().min(1, 'El mínimo de minutos debe ser al menos 1'),
  descripcion:            z.string().optional().nullable(),
})

type ServicioInput = {
  nombre: string
  tipo: (typeof TIPOS)[number]
  precio_minuto_normal: number
  precio_minuto_empresa: number
  precio_minuto_agencia: number
  minimo_minutos: number
  descripcion?: string | null
}

type Result = { error: string } | { success: true }

export async function crearServicio(data: ServicioInput): Promise<Result> {
  const parsed = servicioSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('servicios_maquina').insert({
    nombre:                parsed.data.nombre,
    tipo:                  parsed.data.tipo,
    precio_minuto_normal:  parsed.data.precio_minuto_normal,
    precio_minuto_empresa: parsed.data.precio_minuto_empresa,
    precio_minuto_agencia: parsed.data.precio_minuto_agencia,
    minimo_minutos:        parsed.data.minimo_minutos,
    descripcion:           parsed.data.descripcion ?? null,
    activo:                true,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/servicios-maquina')
  return { success: true }
}

export async function actualizarServicio(id: string, data: ServicioInput): Promise<Result> {
  const parsed = servicioSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('servicios_maquina').update({
    nombre:                parsed.data.nombre,
    tipo:                  parsed.data.tipo,
    precio_minuto_normal:  parsed.data.precio_minuto_normal,
    precio_minuto_empresa: parsed.data.precio_minuto_empresa,
    precio_minuto_agencia: parsed.data.precio_minuto_agencia,
    minimo_minutos:        parsed.data.minimo_minutos,
    descripcion:           parsed.data.descripcion ?? null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/servicios-maquina')
  return { success: true }
}

export async function toggleActivoServicio(id: string, activo: boolean): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from('servicios_maquina').update({ activo }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/servicios-maquina')
  return { success: true }
}
