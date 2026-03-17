import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarCotizacionPDF } from '@/lib/pdf/generarCotizacion'
import { enviarCotizacion } from '@/lib/email/resend'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const asunto: string | undefined = body.asunto
  const cuerpo: string | undefined = body.cuerpo
  const ccExtra: string[] = Array.isArray(body.cc) ? body.cc : []
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Cotización + cliente
  const { data: cot, error: cotError } = await supabase
    .from('cotizaciones')
    .select(`
      id, numero, estado, nivel_precio, subtotal, iva, total,
      notas, created_at, valida_hasta,
      clientes ( nombre, rut, email, telefono, direccion )
    `)
    .eq('id', id)
    .single()

  if (cotError || !cot) {
    return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
  }

  const clienteRaw = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes

  if (!clienteRaw?.email) {
    return NextResponse.json(
      { error: 'El cliente no tiene email registrado' },
      { status: 422 }
    )
  }

  // Ítems
  const { data: items } = await supabase
    .from('cotizacion_items')
    .select(`id, descripcion, ancho, alto, cantidad, precio_unitario, subtotal, orden, productos ( nombre, unidad )`)
    .eq('cotizacion_id', id)
    .order('orden')

  const itemIds = (items ?? []).map((i) => i.id)
  const terminacionesPorItem: Record<string, { nombre: string; precio: number; cantidad: number }[]> = {}

  if (itemIds.length > 0) {
    const { data: terms } = await supabase
      .from('cotizacion_item_terminaciones')
      .select('cotizacion_item_id, nombre, precio, cantidad')
      .in('cotizacion_item_id', itemIds)

    for (const t of terms ?? []) {
      if (!terminacionesPorItem[t.cotizacion_item_id]) terminacionesPorItem[t.cotizacion_item_id] = []
      terminacionesPorItem[t.cotizacion_item_id].push({ nombre: t.nombre, precio: t.precio, cantidad: t.cantidad })
    }
  }

  // Generar PDF
  const pdfData = {
    numero:       cot.numero,
    fecha:        cot.created_at,
    valida_hasta: cot.valida_hasta,
    nivel_precio: cot.nivel_precio,
    subtotal:     cot.subtotal,
    iva:          cot.iva,
    total:        cot.total,
    notas:        cot.notas,
    cliente: {
      nombre:    clienteRaw.nombre,
      rut:       clienteRaw.rut ?? null,
      email:     clienteRaw.email,
      telefono:  clienteRaw.telefono ?? null,
      direccion: clienteRaw.direccion ?? null,
    },
    items: (items ?? []).map((item) => {
      const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
      return {
        descripcion:     item.descripcion ?? prod?.nombre ?? 'Ítem',
        producto_nombre: prod?.nombre ?? null,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal:        item.subtotal,
        unidad:          prod?.unidad ?? 'unidad',
        terminaciones:   terminacionesPorItem[item.id] ?? [],
      }
    }),
  }

  const pdfBuffer = await generarCotizacionPDF(pdfData)

  // Enviar email
  const copiaInterna = process.env.NEXT_PUBLIC_EMPRESA_EMAIL ?? 'victor@vvo.cl'
  const ccFinal = Array.from(new Set([copiaInterna, ...ccExtra]))

  const { error: emailError } = await enviarCotizacion({
    to:               clienteRaw.email,
    cc:               ccFinal,
    numeroCotizacion: cot.numero,
    pdfBuffer,
    asunto,
    cuerpo,
  })

  if (emailError) {
    return NextResponse.json({ error: 'Error al enviar el email' }, { status: 500 })
  }

  // Actualizar estado a 'enviada'
  await supabase
    .from('cotizaciones')
    .update({ estado: 'enviada', enviada_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
