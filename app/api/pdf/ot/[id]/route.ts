import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarOTPDF } from '@/lib/pdf/generarOT'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // OT + cliente + máquina
  const { data: ot, error: otError } = await supabase
    .from('ordenes_trabajo')
    .select(`
      id, numero, estado, fecha_entrega, notas_produccion, total, created_at,
      maquina_id,
      cotizacion_id,
      clientes ( nombre, telefono ),
      maquinas ( nombre )
    `)
    .eq('id', id)
    .single()

  if (otError || !ot) {
    return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 })
  }

  const clienteRaw = Array.isArray(ot.clientes) ? ot.clientes[0] : ot.clientes
  const maquinaRaw = Array.isArray(ot.maquinas) ? ot.maquinas[0] : ot.maquinas

  // Ítems: desde cotización si tiene origen, sino desde ot_items
  type ItemRow = {
    descripcion: string | null
    producto_nombre: string | null
    ancho: number | null
    alto: number | null
    cantidad: number
    subtotal: number
    notas_item?: string | null
  }

  let items: ItemRow[] = []

  if (ot.cotizacion_id) {
    const { data: cotItems, error: cotError } = await supabase
      .from('cotizacion_items')
      .select('descripcion, ancho, alto, cantidad, subtotal, orden, productos(nombre, unidad)')
      .eq('cotizacion_id', ot.cotizacion_id)
      .order('orden')

    if (cotError) {
      return NextResponse.json({ error: 'Error al cargar ítems' }, { status: 500 })
    }

    items = (cotItems ?? []).map((item) => {
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
  } else {
    const { data: otItems, error: itemsError } = await supabase
      .from('ot_items')
      .select('descripcion, ancho, alto, cantidad, subtotal, orden, productos(nombre, unidad)')
      .eq('ot_id', id)
      .order('orden')

    if (itemsError) {
      return NextResponse.json({ error: 'Error al cargar ítems' }, { status: 500 })
    }

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

  const buffer = await generarOTPDF({
    ot: {
      numero:           ot.numero,
      estado:           ot.estado,
      fecha_entrega:    ot.fecha_entrega,
      notas_produccion: ot.notas_produccion,
      total:            ot.total,
      created_at:       ot.created_at,
      maquina_nombre:   maquinaRaw?.nombre ?? null,
    },
    cliente: clienteRaw
      ? { nombre: clienteRaw.nombre, telefono: clienteRaw.telefono ?? null }
      : null,
    items,
  })

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${ot.numero}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
