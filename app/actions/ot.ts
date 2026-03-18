'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { generarOTPDF } from '@/lib/pdf/generarOT'
import { getResend } from '@/lib/email/resend'

// ── Cambiar estado ───────────────────────────────────────────────────────────

type EstadoOT = 'pendiente' | 'en_produccion' | 'terminado' | 'entregado'

export async function cambiarEstadoOT(
  id: string,
  estado: EstadoOT
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ordenes_trabajo')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  // Al iniciar producción, enviar email automáticamente (best effort)
  if (estado === 'en_produccion') {
    const emailResult = await enviarOtAProduccion(id)
    if ('error' in emailResult) {
      console.error(`[OT] Error enviando email de producción para ${id}:`, emailResult.error)
    }
  }

  revalidatePath('/ot')
  revalidatePath(`/ot/${id}`)
  return { success: true }
}

// ── Actualizar campos operativos ─────────────────────────────────────────────

const actualizarOTSchema = z.object({
  maquina_id:        z.string().uuid().optional().nullable(),
  fecha_entrega:     z.string().optional().nullable(),
  notas_produccion:  z.string().optional().nullable(),
  archivo_diseno:    z.string().optional().nullable(),
})

export type ActualizarOTData = z.infer<typeof actualizarOTSchema>

export async function actualizarOT(
  id: string,
  data: ActualizarOTData
): Promise<{ error: string } | { success: true }> {
  const parsed = actualizarOTSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('ordenes_trabajo')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/ot/${id}`)
  return { success: true }
}

// ── Enviar OT a producción por email ─────────────────────────────────────────

export async function enviarOtAProduccion(
  otId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  // Obtener OT + cliente + máquina
  const { data: ot, error: otError } = await supabase
    .from('ordenes_trabajo')
    .select(`
      id, numero, estado, fecha_entrega, notas_produccion, total, created_at,
      cotizacion_id,
      clientes ( nombre, telefono ),
      maquinas ( nombre )
    `)
    .eq('id', otId)
    .single()

  if (otError || !ot) return { error: 'OT no encontrada' }

  const clienteRaw = Array.isArray(ot.clientes) ? ot.clientes[0] : ot.clientes
  const maquinaRaw = Array.isArray(ot.maquinas) ? ot.maquinas[0] : ot.maquinas

  // Ítems
  type ItemRow = {
    descripcion: string | null
    producto_nombre: string | null
    ancho: number | null
    alto: number | null
    cantidad: number
    subtotal: number
  }

  let items: ItemRow[] = []

  if (ot.cotizacion_id) {
    const { data: cotItems } = await supabase
      .from('cotizacion_items')
      .select('titulo_item, descripcion, ancho, alto, cantidad, subtotal, orden, productos(nombre, unidad)')
      .eq('cotizacion_id', ot.cotizacion_id)
      .order('orden')

    items = (cotItems ?? []).map((item) => {
      const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
      const itemAny = item as typeof item & { titulo_item?: string | null }
      const titulo = prod?.nombre ?? itemAny.titulo_item ?? item.descripcion ?? 'Ítem'
      return {
        descripcion:     titulo,
        producto_nombre: prod?.nombre ?? null,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        subtotal:        item.subtotal,
      }
    })
  } else {
    const { data: otItems } = await supabase
      .from('ot_items')
      .select('descripcion, ancho, alto, cantidad, subtotal, orden, productos(nombre, unidad)')
      .eq('ot_id', otId)
      .order('orden')

    items = (otItems ?? []).map((item) => {
      const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
      return {
        descripcion:     item.descripcion,
        producto_nombre: prod?.nombre ?? null,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        subtotal:        item.subtotal,
      }
    })
  }

  // Generar PDF
  const pdfBuffer = await generarOTPDF({
    ot: {
      numero:           ot.numero,
      estado:           ot.estado,
      created_at:       ot.created_at,
      fecha_entrega:    ot.fecha_entrega,
      notas_produccion: ot.notas_produccion,
      total:            ot.total,
      maquina_nombre:   maquinaRaw?.nombre ?? null,
    },
    cliente: clienteRaw
      ? { nombre: clienteRaw.nombre, telefono: clienteRaw.telefono ?? null }
      : null,
    items,
  })

  // Formatear datos para el email
  const fechaEntrega = ot.fecha_entrega
    ? new Date(ot.fecha_entrega + 'T12:00:00').toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : 'Sin fecha'

  const totalFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0,
  }).format(ot.total)

  const destinatario =
    process.env.NEXT_PUBLIC_EMPRESA_EMAIL ?? 'victor@vvo.cl'

  const { error: emailError } = await getResend().emails.send({
    from: 'cotizaciones@mail.vvo.cl',
    to: destinatario,
    subject: `OT ${ot.numero} — Lista para producción`,
    html: `
      <div style="font-family:sans-serif;font-size:14px;color:#1a1a2e;max-width:600px">
        <div style="background:#3d1450;padding:20px 24px;border-radius:8px 8px 0 0">
          <span style="color:#fff;font-size:18px;font-weight:700">VVO Publicidad</span>
          <span style="color:#e91e8c;font-size:16px;font-weight:700;margin-left:12px">${ot.numero}</span>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 16px;font-size:16px;color:#3d1450">Nueva orden de trabajo lista para producción</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr>
              <td style="padding:6px 0;color:#6b7280;width:140px">Número OT</td>
              <td style="padding:6px 0;font-weight:600">${ot.numero}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280">Cliente</td>
              <td style="padding:6px 0;font-weight:600">${clienteRaw?.nombre ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280">Máquina</td>
              <td style="padding:6px 0;font-weight:600">${maquinaRaw?.nombre ?? 'Sin asignar'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280">Fecha de entrega</td>
              <td style="padding:6px 0;font-weight:600">${fechaEntrega}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280">Total</td>
              <td style="padding:6px 0;font-weight:700;color:#e91e8c;font-size:15px">${totalFormateado}</td>
            </tr>
          </table>
          <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;font-size:12px;color:#6b7280">
            <strong style="color:#3d1450">Victor Valdebenito — VVO Publicidad</strong><br/>
            +56 9 86193102 &nbsp;|&nbsp; victor@vvo.cl &nbsp;|&nbsp; vvo.cl
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `${ot.numero}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (emailError) return { error: emailError.message }

  return { success: true }
}
