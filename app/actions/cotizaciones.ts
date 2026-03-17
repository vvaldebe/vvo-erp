'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calcularIva } from '@/lib/utils/calculos'
import { generarNumeroOT, generarNumeroCotizacion } from '@/lib/utils/numeracion'

// ── Schemas ────────────────────────────────────────────────────────────────

const terminacionItemSchema = z.object({
  terminacion_id: z.string().uuid().optional().nullable(),
  nombre:         z.string().min(1),
  precio:         z.number().min(0),
  cantidad:       z.number().int().min(1),
})

const cotizacionItemSchema = z.object({
  producto_id:    z.string().uuid().optional().nullable(),
  descripcion:    z.string().optional().nullable(),
  ancho:          z.number().min(0).optional().nullable(),
  alto:           z.number().min(0).optional().nullable(),
  cantidad:       z.number().int().min(1),
  precio_unitario: z.number().min(0),
  subtotal:       z.number().min(0),
  orden:          z.number().int().min(0),
  notas_item:     z.string().optional().nullable(),
  terminaciones:  z.array(terminacionItemSchema).default([]),
})

const cotizacionSchema = z.object({
  numero:       z.string().min(1),
  cliente_id:   z.string().uuid().optional().nullable(),
  nivel_precio: z.enum(['normal', 'empresa', 'agencia', 'especial']),
  notas:        z.string().optional().nullable(),
  valida_hasta: z.string().optional().nullable(),
  items:        z.array(cotizacionItemSchema).min(1, 'Debe agregar al menos un ítem'),
})

export type CotizacionFormData = z.infer<typeof cotizacionSchema>
export type CotizacionActionResult = { error: string } | { success: true; id: string }

// ── Action principal ───────────────────────────────────────────────────────

export async function crearCotizacion(data: CotizacionFormData): Promise<CotizacionActionResult> {
  const parsed = cotizacionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const d = parsed.data

  // Calcular totales
  const subtotal = d.items.reduce((acc, item) => acc + item.subtotal, 0)
  const iva      = calcularIva(subtotal)
  const total    = subtotal + iva

  const supabase = await createClient()

  // 1. Insertar cotización
  const { data: cotRow, error: cotError } = await supabase
    .from('cotizaciones')
    .insert({
      numero:       d.numero,
      cliente_id:   d.cliente_id ?? null,
      nivel_precio: d.nivel_precio,
      estado:       'borrador',
      subtotal:     Math.round(subtotal),
      iva:          Math.round(iva),
      total:        Math.round(total),
      notas:        d.notas ?? null,
      valida_hasta: d.valida_hasta ?? null,
    })
    .select('id')
    .single()

  if (cotError) return { error: cotError.message }

  const cotizacionId = cotRow.id

  // 2. Insertar ítems
  for (const item of d.items) {
    const { data: itemRow, error: itemError } = await supabase
      .from('cotizacion_items')
      .insert({
        cotizacion_id:   cotizacionId,
        producto_id:     item.producto_id ?? null,
        descripcion:     item.descripcion ?? null,
        ancho:           item.ancho ?? null,
        alto:            item.alto ?? null,
        cantidad:        item.cantidad,
        precio_unitario: Math.round(item.precio_unitario),
        subtotal:        Math.round(item.subtotal),
        orden:           item.orden,
        notas_item:      item.notas_item ?? null,
      })
      .select('id')
      .single()

    if (itemError) return { error: itemError.message }

    // 3. Insertar terminaciones del ítem
    if (item.terminaciones.length > 0) {
      const terminacionesRows = item.terminaciones.map((t) => ({
        cotizacion_item_id: itemRow.id,
        terminacion_id:     t.terminacion_id ?? null,
        nombre:             t.nombre,
        precio:             Math.round(t.precio),
        cantidad:           t.cantidad,
      }))

      const { error: termError } = await supabase
        .from('cotizacion_item_terminaciones')
        .insert(terminacionesRows)

      if (termError) return { error: termError.message }
    }
  }

  revalidatePath('/cotizaciones')
  redirect(`/cotizaciones/${cotizacionId}`)
}

// ── Cambiar estado ──────────────────────────────────────────────────────────

export async function cambiarEstadoCotizacion(
  id: string,
  estado: 'aprobada' | 'rechazada'
): Promise<{ error: string } | { success: true; otId?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cotizaciones')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/cotizaciones')
  revalidatePath(`/cotizaciones/${id}`)

  // Al aprobar, crear OT automáticamente
  if (estado === 'aprobada') {
    // Obtener datos de la cotización
    const { data: cot } = await supabase
      .from('cotizaciones')
      .select('numero, cliente_id, subtotal, total')
      .eq('id', id)
      .single()

    if (cot) {
      // Correlativo para número OT
      const { count } = await supabase
        .from('ordenes_trabajo')
        .select('*', { count: 'exact', head: true })

      const numeroOT = generarNumeroOT((count ?? 0) + 1)

      const { data: otRow } = await supabase
        .from('ordenes_trabajo')
        .insert({
          numero:        numeroOT,
          cotizacion_id: id,
          cliente_id:    cot.cliente_id ?? null,
          estado:        'pendiente',
          subtotal:      cot.subtotal,
          total:         cot.total,
        })
        .select('id')
        .single()

      if (otRow) {
        revalidatePath('/ot')
        return { success: true, otId: otRow.id }
      }
    }
  }

  return { success: true }
}

// ── Actualizar cotización existente ─────────────────────────────────────────

const actualizarCotizacionSchema = cotizacionSchema.omit({ numero: true })

export async function actualizarCotizacion(
  id: string,
  data: Omit<CotizacionFormData, 'numero'>
): Promise<CotizacionActionResult> {
  const parsed = actualizarCotizacionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const d = parsed.data
  const subtotal = d.items.reduce((acc, item) => acc + item.subtotal, 0)
  const iva      = calcularIva(subtotal)
  const total    = subtotal + iva

  const supabase = await createClient()

  // Actualizar cabecera
  const { error: cotError } = await supabase
    .from('cotizaciones')
    .update({
      cliente_id:   d.cliente_id ?? null,
      nivel_precio: d.nivel_precio,
      subtotal:     Math.round(subtotal),
      iva:          Math.round(iva),
      total:        Math.round(total),
      notas:        d.notas ?? null,
      valida_hasta: d.valida_hasta ?? null,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', id)

  if (cotError) return { error: cotError.message }

  // Borrar ítems anteriores (cascade elimina terminaciones)
  await supabase.from('cotizacion_items').delete().eq('cotizacion_id', id)

  // Reinsertar ítems
  for (const item of d.items) {
    const { data: itemRow, error: itemError } = await supabase
      .from('cotizacion_items')
      .insert({
        cotizacion_id:   id,
        producto_id:     item.producto_id ?? null,
        descripcion:     item.descripcion ?? null,
        ancho:           item.ancho ?? null,
        alto:            item.alto ?? null,
        cantidad:        item.cantidad,
        precio_unitario: Math.round(item.precio_unitario),
        subtotal:        Math.round(item.subtotal),
        orden:           item.orden,
        notas_item:      item.notas_item ?? null,
      })
      .select('id')
      .single()

    if (itemError) return { error: itemError.message }

    if (item.terminaciones.length > 0) {
      const { error: termError } = await supabase
        .from('cotizacion_item_terminaciones')
        .insert(item.terminaciones.map((t) => ({
          cotizacion_item_id: itemRow.id,
          terminacion_id:     t.terminacion_id ?? null,
          nombre:             t.nombre,
          precio:             Math.round(t.precio),
          cantidad:           t.cantidad,
        })))
      if (termError) return { error: termError.message }
    }
  }

  revalidatePath('/cotizaciones')
  revalidatePath(`/cotizaciones/${id}`)
  redirect(`/cotizaciones/${id}`)
}

// ── Clonar cotización ────────────────────────────────────────────────────────

export async function clonarCotizacion(
  id: string
): Promise<CotizacionActionResult> {
  const supabase = await createClient()

  // Obtener cotización original
  const { data: original, error: origError } = await supabase
    .from('cotizaciones')
    .select('cliente_id, nivel_precio, notas, subtotal, iva, total')
    .eq('id', id)
    .single()

  if (origError || !original) return { error: 'Cotización no encontrada' }

  // Número nuevo
  const { count } = await supabase
    .from('cotizaciones')
    .select('*', { count: 'exact', head: true })

  const numero = generarNumeroCotizacion((count ?? 0) + 1)

  // Crear nueva cotización
  const { data: nueva, error: nuevaError } = await supabase
    .from('cotizaciones')
    .insert({
      numero,
      cliente_id:   original.cliente_id,
      nivel_precio: original.nivel_precio,
      estado:       'borrador',
      subtotal:     original.subtotal,
      iva:          original.iva,
      total:        original.total,
      notas:        original.notas,
      valida_hasta: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    })
    .select('id')
    .single()

  if (nuevaError || !nueva) return { error: nuevaError?.message ?? 'Error al clonar' }

  // Copiar ítems
  const { data: items } = await supabase
    .from('cotizacion_items')
    .select('id, producto_id, descripcion, ancho, alto, cantidad, precio_unitario, subtotal, orden')
    .eq('cotizacion_id', id)

  for (const item of items ?? []) {
    const { data: newItem, error: itemErr } = await supabase
      .from('cotizacion_items')
      .insert({
        cotizacion_id:   nueva.id,
        producto_id:     item.producto_id,
        descripcion:     item.descripcion,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal:        item.subtotal,
        orden:           item.orden,
      })
      .select('id')
      .single()

    if (itemErr || !newItem) continue

    const { data: terms } = await supabase
      .from('cotizacion_item_terminaciones')
      .select('terminacion_id, nombre, precio, cantidad')
      .eq('cotizacion_item_id', item.id)

    if (terms && terms.length > 0) {
      await supabase.from('cotizacion_item_terminaciones').insert(
        terms.map((t) => ({
          cotizacion_item_id: newItem.id,
          terminacion_id:     t.terminacion_id,
          nombre:             t.nombre,
          precio:             t.precio,
          cantidad:           t.cantidad,
        }))
      )
    }
  }

  revalidatePath('/cotizaciones')
  redirect(`/cotizaciones/${nueva.id}`)
}
