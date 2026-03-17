'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ContactoData {
  nombre: string
  cargo?: string
  email?: string
  telefono?: string
  es_principal?: boolean
}

export type ContactoActionResult = { error: string } | { success: true; id: string }

export async function crearContacto(
  clienteId: string,
  data: ContactoData
): Promise<ContactoActionResult> {
  if (!data.nombre?.trim()) {
    return { error: 'El nombre del contacto es requerido' }
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('contactos')
    .insert({
      cliente_id:   clienteId,
      nombre:       data.nombre.trim(),
      cargo:        data.cargo?.trim() || null,
      email:        data.email?.trim() || null,
      telefono:     data.telefono?.trim() || null,
      es_principal: data.es_principal ?? false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clienteId}`)
  return { success: true, id: row.id }
}

export async function actualizarContacto(
  id: string,
  clienteId: string,
  data: ContactoData
): Promise<ContactoActionResult> {
  if (!data.nombre?.trim()) {
    return { error: 'El nombre del contacto es requerido' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({
      nombre:       data.nombre.trim(),
      cargo:        data.cargo?.trim() || null,
      email:        data.email?.trim() || null,
      telefono:     data.telefono?.trim() || null,
      es_principal: data.es_principal ?? false,
    })
    .eq('id', id)
    .eq('cliente_id', clienteId)

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clienteId}`)
  return { success: true, id }
}

export async function eliminarContacto(
  id: string,
  clienteId: string
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .delete()
    .eq('id', id)
    .eq('cliente_id', clienteId)

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clienteId}`)
  return { success: true }
}

export async function setContactoPrincipal(
  id: string,
  clienteId: string
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()

  // Set all contacts of this client to es_principal=false
  const { error: resetError } = await supabase
    .from('contactos')
    .update({ es_principal: false })
    .eq('cliente_id', clienteId)

  if (resetError) return { error: resetError.message }

  // Set the selected contact to es_principal=true
  const { error } = await supabase
    .from('contactos')
    .update({ es_principal: true })
    .eq('id', id)
    .eq('cliente_id', clienteId)

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clienteId}`)
  return { success: true }
}
