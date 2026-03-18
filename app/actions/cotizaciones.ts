'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calcularIva } from '@/lib/utils/calculos'
import { generarNumeroOT, generarNumeroCotizacion } from '@/lib/utils/numeracion'
import { randomUUID } from 'crypto'

// ── Helpers de numeración seguros (usan MAX, no COUNT) ─────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function nextNumeroCotizacion(supabase: SupabaseClient): Promise<string> {
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('cotizaciones')
    .select('numero')
    .like('numero', `COT-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const last = data?.[0]?.numero
  const n = last ? parseInt(last.split('-')[2] ?? '0', 10) : 0
  return generarNumeroCotizacion(isNaN(n) ? 1 : n + 1)
}

async function nextNumeroOT(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('ordenes_trabajo')
    .select('numero')
    .like('numero', 'OT-%')
    .order('numero', { ascending: false })
    .limit(1)
  const last = data?.[0]?.numero
  const n = last ? parseInt(last.replace('OT-', ''), 10) : 0
  return generarNumeroOT(isNaN(n) ? 1 : n + 1)
}

// ── Schemas ────────────────────────────────────────────────────────────────

const terminacionItemSchema = z.object({
  terminacion_id: z.string().uuid().optional().nullable(),
  nombre:         z.string().min(1),
  precio:         z.number().min(0),
  cantidad:       z.number().int().min(1),
})

const cotizacionItemSchema = z.object({
  producto_id:    z.string().uuid().optional().nullable(),
  titulo_item:    z.string().optional().nullable(),
  descripcion:    z.string().optional().nullable(),
  ancho:          z.number().min(0).optional().nullable(),
  alto:           z.number().min(0).optional().nullable(),
  cantidad:       z.number().int().min(1),
  precio_unitario: z.number().min(0),
  subtotal:       z.number().min(0),
  orden:          z.number().int().min(0),
  notas_item:     z.string().optional().nullable(),
  unidad:         z.enum(['m2', 'ml', 'unidad']).default('m2'),
  terminaciones:  z.array(terminacionItemSchema).default([]),
})

const cotizacionSchema = z.object({
  numero:       z.string().min(1),
  cliente_id:   z.string().uuid().optional().nullable(),
  nivel_precio: z.enum(['normal', 'empresa', 'agencia', 'especial']),
  notas:        z.string().optional().nullable(),
  asunto:       z.string().optional().nullable(),
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

  // 1. Generar número seguro server-side (ignora el que viene del form)
  const numero = await nextNumeroCotizacion(supabase)

  // 2. Insertar cotización
  const { data: cotRow, error: cotError } = await supabase
    .from('cotizaciones')
    .insert({
      numero,
      cliente_id:   d.cliente_id ?? null,
      nivel_precio: d.nivel_precio,
      estado:       'borrador',
      subtotal:     Math.round(subtotal),
      iva:          Math.round(iva),
      total:        Math.round(total),
      notas:        d.notas ?? null,
      asunto:       d.asunto ?? null,
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
        titulo_item:     item.titulo_item ?? null,
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
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cotizaciones')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/cotizaciones')
  revalidatePath(`/cotizaciones/${id}`)

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
      asunto:       d.asunto ?? null,
      valida_hasta: d.valida_hasta ?? null,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', id)

  if (cotError) return { error: cotError.message }

  // Borrar ítems anteriores (cascade elimina terminaciones)
  const { error: deleteError } = await supabase.from('cotizacion_items').delete().eq('cotizacion_id', id)
  if (deleteError) return { error: 'Error al actualizar ítems: ' + deleteError.message }

  // Reinsertar ítems
  for (const item of d.items) {
    const { data: itemRow, error: itemError } = await supabase
      .from('cotizacion_items')
      .insert({
        cotizacion_id:   id,
        producto_id:     item.producto_id ?? null,
        titulo_item:     item.titulo_item ?? null,
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
    .select('cliente_id, nivel_precio, notas, asunto, subtotal, iva, total')
    .eq('id', id)
    .single()

  if (origError || !original) return { error: 'Cotización no encontrada' }

  // Número nuevo (MAX-based para evitar duplicados)
  const numero = await nextNumeroCotizacion(supabase)

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
      asunto:       original.asunto,
      valida_hasta: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
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

// ── Generar token de aprobación ──────────────────────────────────────────────

export async function generarTokenAprobacion(cotizacionId: string): Promise<string> {
  const token = randomUUID()
  const supabase = await createClient()
  await supabase
    .from('cotizaciones')
    .update({ token_aprobacion: token })
    .eq('id', cotizacionId)
  return token
}

// ── Aprobar cotización por token (página pública) ────────────────────────────

export async function aprobarCotizacionPorToken(
  token: string
): Promise<{ success: true } | { error: string }> {
  // Admin client para bypassear RLS — acción pública sin sesión
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  const { data: cot, error } = await supabase
    .from('cotizaciones')
    .select('id, numero, total, estado, clientes ( nombre )')
    .eq('token_aprobacion', token)
    .single()

  if (error || !cot) return { error: 'Cotización no encontrada o token inválido' }
  if (cot.estado === 'aprobada') return { error: 'Esta cotización ya fue aprobada' }
  if (cot.estado === 'rechazada') return { error: 'Esta cotización ya fue rechazada' }

  const { error: updateError } = await supabase
    .from('cotizaciones')
    .update({
      estado:           'aprobada',
      token_aprobacion: null,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', cot.id)

  if (updateError) return { error: updateError.message }

  // Notificar a Victor por email
  try {
    const { getResend } = await import('@/lib/email/resend')
    const clienteNombre = Array.isArray(cot.clientes)
      ? (cot.clientes[0] as { nombre: string })?.nombre ?? 'Cliente'
      : (cot.clientes as { nombre: string } | null)?.nombre ?? 'Cliente'
    const totalFormateado = new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', minimumFractionDigits: 0,
    }).format(cot.total)
    const destinatario = process.env.NEXT_PUBLIC_EMPRESA_EMAIL ?? 'victor@vvo.cl'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sistema.vvo.cl'

    await getResend().emails.send({
      from: 'cotizaciones@mail.vvo.cl',
      to: destinatario,
      subject: `✓ ${cot.numero} aprobada por ${clienteNombre}`,
      html: `
        <div style="font-family:sans-serif;font-size:14px;color:#1a1a2e;max-width:500px">
          <div style="background:#1a1a2e;padding:20px 24px;border-radius:8px 8px 0 0">
            <span style="color:#fff;font-size:18px;font-weight:700">VVO Publicidad</span>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px">
              <p style="margin:0;font-size:16px;font-weight:700;color:#166534">✓ Cotización aprobada</p>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
              <tr><td style="padding:6px 0;color:#6b7280">Cotización</td><td style="font-weight:700">${cot.numero}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Cliente</td><td>${clienteNombre}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Total</td><td style="font-weight:700;font-size:15px">${totalFormateado}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Aprobada</td><td>${new Date().toLocaleString('es-CL')}</td></tr>
            </table>
            <a href="${appUrl}/cotizaciones/${cot.id}"
               style="display:inline-block;background:#3d1450;color:#fff;font-weight:600;font-size:14px;padding:10px 20px;border-radius:6px;text-decoration:none">
              Ver cotización →
            </a>
          </div>
        </div>
      `,
    })
  } catch {
    // El email de notificación falla silenciosamente — no interrumpir la aprobación
  }

  revalidatePath('/cotizaciones')
  revalidatePath(`/cotizaciones/${cot.id}`)
  return { success: true }
}

// ── Crear OT desde cotización aprobada ──────────────────────────────────────

export async function crearOTdesdeCotizacion(
  cotizacionId: string,
  maquinaId: string | null
): Promise<{ error: string } | { otId: string }> {
  const supabase = await createClient()

  // 1. Fetch cotización y validar que existe y está aprobada
  const { data: cot, error: cotError } = await supabase
    .from('cotizaciones')
    .select('id, numero, cliente_id, subtotal, total, estado')
    .eq('id', cotizacionId)
    .single()

  if (cotError || !cot) return { error: 'Cotización no encontrada' }
  if (cot.estado !== 'aprobada') return { error: 'La cotización debe estar aprobada para generar una OT' }

  // 2. Verificar que no tenga ya una OT
  const { data: otExistente } = await supabase
    .from('ordenes_trabajo')
    .select('id')
    .eq('cotizacion_id', cotizacionId)
    .maybeSingle()

  if (otExistente) return { error: 'Ya existe una OT para esta cotización' }

  // 3. Generar número OT (MAX-based para evitar duplicados)
  const numeroOT = await nextNumeroOT(supabase)

  // 4. Insertar OT
  const { data: otRow, error: otError } = await supabase
    .from('ordenes_trabajo')
    .insert({
      numero:        numeroOT,
      cotizacion_id: cotizacionId,
      cliente_id:    cot.cliente_id ?? null,
      maquina_id:    maquinaId ?? null,
      estado:        'pendiente',
      subtotal:      cot.subtotal,
      total:         cot.total,
    })
    .select('id')
    .single()

  if (otError || !otRow) return { error: otError?.message ?? 'Error al crear la OT' }

  // 5. Revalidar rutas
  revalidatePath('/ot')
  revalidatePath('/cotizaciones')
  revalidatePath(`/cotizaciones/${cotizacionId}`)

  return { otId: otRow.id }
}

// ── Aprobar cotización y generar OT en un solo paso ──────────────────────────

export async function aprobarYGenerarOT(
  id: string
): Promise<{ error: string } | { otId: string } | { approved: true }> {
  const supabase = await createClient()

  // 1. Aprobar cotización
  const { error: approveError } = await supabase
    .from('cotizaciones')
    .update({ estado: 'aprobada', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (approveError) return { error: approveError.message }

  revalidatePath('/cotizaciones')

  // 2. Crear OT (best-effort — si falla no bloquea la aprobación)
  const otResult = await crearOTdesdeCotizacion(id, null)
  if ('error' in otResult) return { approved: true }

  return { otId: otResult.otId }
}

// ── Paginación ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export interface CotizacionListRow {
  id: string
  numero: string
  estado: 'borrador' | 'enviada' | 'aprobada' | 'rechazada'
  total: number
  created_at: string
  cliente_nombre: string
}

export async function fetchCotizacionesPage(
  offset: number,
): Promise<{ rows: CotizacionListRow[]; hasMore: boolean }> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('cotizaciones')
    .select('id, numero, estado, total, created_at, clientes(nombre)')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const rows: CotizacionListRow[] = (data ?? []).map((row) => {
    const c = row.clientes
    let nombre = '—'
    if (c) nombre = Array.isArray(c) ? ((c as { nombre: string }[])[0]?.nombre ?? '—') : (c as { nombre: string }).nombre ?? '—'
    return {
      id:             row.id,
      numero:         row.numero,
      estado:         row.estado as CotizacionListRow['estado'],
      total:          row.total,
      created_at:     row.created_at,
      cliente_nombre: nombre,
    }
  })

  return { rows, hasMore: rows.length === PAGE_SIZE }
}

// ── Bulk actions ────────────────────────────────────────────────────────────

const bulkIdsSchema = z.array(z.string().uuid()).min(1)

export async function bulkCambiarEstadoCotizaciones(
  ids: string[],
  estado: 'enviada' | 'aprobada' | 'rechazada',
): Promise<{ error: string } | { success: true; count: number }> {
  const parsed = bulkIdsSchema.safeParse(ids)
  if (!parsed.success) return { error: 'IDs inválidos' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cotizaciones')
    .update({ estado, updated_at: new Date().toISOString() })
    .in('id', parsed.data)
    .select('id')

  if (error) return { error: error.message }

  revalidatePath('/cotizaciones')
  return { success: true, count: (data ?? []).length }
}

export async function bulkEliminarCotizaciones(
  ids: string[],
): Promise<{ error: string } | { success: true; count: number }> {
  const parsed = bulkIdsSchema.safeParse(ids)
  if (!parsed.success) return { error: 'IDs inválidos' }

  const supabase = await createClient()

  // Safety: only delete borrador or rechazada
  const { data, error } = await supabase
    .from('cotizaciones')
    .delete()
    .in('id', parsed.data)
    .in('estado', ['borrador', 'rechazada'])
    .select('id')

  if (error) return { error: error.message }

  revalidatePath('/cotizaciones')
  return { success: true, count: (data ?? []).length }
}

// ── Búsqueda ─────────────────────────────────────────────────────────────────

export async function buscarCotizaciones(
  query: string,
): Promise<CotizacionListRow[]> {
  const supabase = await createClient()
  const q = query.trim()
  if (!q || q.length < 2) return []

  // Query 1: match by numero
  const { data: byNumero } = await supabase
    .from('cotizaciones')
    .select('id, numero, estado, total, created_at, clientes(nombre)')
    .ilike('numero', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(100)

  // Query 2: find client IDs matching the name, then fetch their cotizaciones
  const { data: clientesMatch } = await supabase
    .from('clientes')
    .select('id')
    .ilike('nombre', `%${q}%`)
    .limit(50)

  const clienteIds = (clientesMatch ?? []).map((c) => c.id)
  let byCliente: typeof byNumero = []
  if (clienteIds.length > 0) {
    const { data } = await supabase
      .from('cotizaciones')
      .select('id, numero, estado, total, created_at, clientes(nombre)')
      .in('cliente_id', clienteIds)
      .order('created_at', { ascending: false })
      .limit(100)
    byCliente = data ?? []
  }

  // Merge and deduplicate by id
  const seen = new Set<string>()
  const merged: CotizacionListRow[] = []

  for (const row of [...(byNumero ?? []), ...(byCliente ?? [])]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    const c = row.clientes
    let nombre = '—'
    if (c) nombre = Array.isArray(c) ? ((c as { nombre: string }[])[0]?.nombre ?? '—') : (c as { nombre: string }).nombre ?? '—'
    merged.push({
      id:             row.id,
      numero:         row.numero,
      estado:         row.estado as CotizacionListRow['estado'],
      total:          row.total,
      created_at:     row.created_at,
      cliente_nombre: nombre,
    })
  }

  // Sort merged results by created_at descending
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return merged
}
