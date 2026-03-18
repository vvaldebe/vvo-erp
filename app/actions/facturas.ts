'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calcularIva } from '@/lib/utils/calculos'

// ── Schemas ──────────────────────────────────────────────────────────────────

const facturaSchema = z.object({
  numero_sii:        z.string().optional().nullable(),
  cliente_id:        z.string().uuid().optional().nullable(),
  ot_id:             z.string().uuid().optional().nullable(),
  cotizacion_id:     z.string().uuid().optional().nullable(),
  monto_neto:        z.number().min(0),
  fecha_emision:     z.string().min(1, 'Fecha requerida'),
  fecha_vencimiento: z.string().optional().nullable(),
  notas:             z.string().optional().nullable(),
})

export type FacturaFormData = z.infer<typeof facturaSchema>
export type FacturaActionResult = { error: string } | { success: true; id: string }

const pagoSchema = z.object({
  monto:  z.number().min(1, 'El monto debe ser mayor a 0'),
  fecha:  z.string().min(1, 'Fecha requerida'),
  metodo: z.enum(['transferencia', 'efectivo', 'cheque', 'tarjeta']),
  notas:  z.string().optional().nullable(),
})

export type PagoFormData = z.infer<typeof pagoSchema>

// ── Crear factura ────────────────────────────────────────────────────────────

export async function crearFactura(data: FacturaFormData): Promise<FacturaActionResult> {
  const parsed = facturaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const d   = parsed.data
  const iva = calcularIva(d.monto_neto)

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('facturas')
    .insert({
      numero_sii:        d.numero_sii || null,
      cliente_id:        d.cliente_id || null,
      ot_id:             d.ot_id || null,
      cotizacion_id:     d.cotizacion_id || null,
      monto_neto:        Math.round(d.monto_neto),
      iva:               Math.round(iva),
      total:             Math.round(d.monto_neto + iva),
      estado:            'pendiente',
      fecha_emision:     d.fecha_emision,
      fecha_vencimiento: d.fecha_vencimiento || null,
      notas:             d.notas || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/facturas')
  redirect(`/facturas/${row.id}`)
}

// ── Registrar pago ───────────────────────────────────────────────────────────

export async function registrarPago(
  facturaId: string,
  data: PagoFormData
): Promise<{ error: string } | { success: true }> {
  const parsed = pagoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  // Insertar pago
  const { error: pagoError } = await supabase
    .from('pagos')
    .insert({
      factura_id: facturaId,
      monto:      Math.round(parsed.data.monto),
      fecha:      parsed.data.fecha,
      metodo:     parsed.data.metodo,
      notas:      parsed.data.notas || null,
    })

  if (pagoError) return { error: pagoError.message }

  // Calcular total pagado y actualizar estado si corresponde
  const { data: factura } = await supabase
    .from('facturas')
    .select('total')
    .eq('id', facturaId)
    .single()

  const { data: pagos } = await supabase
    .from('pagos')
    .select('monto')
    .eq('factura_id', facturaId)

  const totalPagado = (pagos ?? []).reduce((sum, p) => sum + p.monto, 0)

  if (factura && totalPagado >= factura.total) {
    const { error: updateError } = await supabase
      .from('facturas')
      .update({ estado: 'pagada' })
      .eq('id', facturaId)
    if (updateError) return { error: 'Error al actualizar estado de factura: ' + updateError.message }
  }

  revalidatePath(`/facturas/${facturaId}`)
  revalidatePath('/facturas')
  return { success: true }
}

// ── Cambiar estado ───────────────────────────────────────────────────────────

export async function cambiarEstadoFactura(
  id: string,
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada'
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('facturas')
    .update({ estado })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/facturas')
  revalidatePath(`/facturas/${id}`)
  return { success: true }
}
