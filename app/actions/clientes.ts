'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const clienteSchema = z.object({
  nombre:               z.string().min(1, 'El nombre es requerido'),
  rut:                  z.string().optional(),
  email:                z.string().email('Email inválido').optional().or(z.literal('')),
  telefono:             z.string().optional(),
  direccion:            z.string().optional(),
  nivel_precio:         z.enum(['normal', 'empresa', 'agencia', 'especial']),
  descuento_porcentaje: z.number().min(0).max(100).default(0),
  canal_origen:         z.string().optional(),
  notas:                z.string().optional(),
  // CRM extended fields
  razon_social:         z.string().optional(),
  nombre_fantasia:      z.string().optional(),
  giro:                 z.string().optional(),
  direccion_fiscal:     z.string().optional(),
  comuna:               z.string().optional(),
  ciudad:               z.string().optional(),
  sitio_web:            z.string().optional(),
}).refine(
  (data) => data.nivel_precio !== 'especial' || data.descuento_porcentaje > 0,
  { message: 'El descuento debe ser mayor a 0 para nivel Especial', path: ['descuento_porcentaje'] }
)

export type ClienteFormData = z.infer<typeof clienteSchema>
export type ClienteActionResult = { error: string } | { success: true; id: string }

export async function crearCliente(data: ClienteFormData): Promise<ClienteActionResult> {
  const parsed = clienteSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('clientes')
    .insert({
      nombre:               parsed.data.nombre,
      rut:                  parsed.data.rut || null,
      email:                parsed.data.email || null,
      telefono:             parsed.data.telefono || null,
      direccion:            parsed.data.direccion || null,
      nivel_precio:         parsed.data.nivel_precio,
      descuento_porcentaje: parsed.data.nivel_precio === 'especial'
                              ? parsed.data.descuento_porcentaje
                              : 0,
      canal_origen:         parsed.data.canal_origen || null,
      notas:                parsed.data.notas || null,
      activo:               true,
      // CRM extended fields
      razon_social:         parsed.data.razon_social || null,
      nombre_fantasia:      parsed.data.nombre_fantasia || null,
      giro:                 parsed.data.giro || null,
      direccion_fiscal:     parsed.data.direccion_fiscal || null,
      comuna:               parsed.data.comuna || null,
      ciudad:               parsed.data.ciudad || null,
      sitio_web:            parsed.data.sitio_web || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/clientes')
  return { success: true, id: row.id }
}

export async function actualizarCliente(
  id: string,
  data: ClienteFormData
): Promise<ClienteActionResult> {
  const parsed = clienteSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('clientes')
    .update({
      nombre:               parsed.data.nombre,
      rut:                  parsed.data.rut || null,
      email:                parsed.data.email || null,
      telefono:             parsed.data.telefono || null,
      direccion:            parsed.data.direccion || null,
      nivel_precio:         parsed.data.nivel_precio,
      descuento_porcentaje: parsed.data.nivel_precio === 'especial'
                              ? parsed.data.descuento_porcentaje
                              : 0,
      canal_origen:         parsed.data.canal_origen || null,
      notas:                parsed.data.notas || null,
      // CRM extended fields
      razon_social:         parsed.data.razon_social || null,
      nombre_fantasia:      parsed.data.nombre_fantasia || null,
      giro:                 parsed.data.giro || null,
      direccion_fiscal:     parsed.data.direccion_fiscal || null,
      comuna:               parsed.data.comuna || null,
      ciudad:               parsed.data.ciudad || null,
      sitio_web:            parsed.data.sitio_web || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  return { success: true, id }
}
