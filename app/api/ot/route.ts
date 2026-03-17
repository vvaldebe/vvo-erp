import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { numero, cliente_id, maquina_id, fecha_entrega, notas_produccion, subtotal, total, items } = body

  if (!numero) return NextResponse.json({ error: 'Número requerido' }, { status: 400 })

  const { data: ot, error: otError } = await supabase
    .from('ordenes_trabajo')
    .insert({
      numero,
      cliente_id:       cliente_id ?? null,
      maquina_id:       maquina_id ?? null,
      fecha_entrega:    fecha_entrega ?? null,
      notas_produccion: notas_produccion ?? null,
      estado:           'pendiente',
      subtotal:         subtotal ?? 0,
      total:            total ?? 0,
    })
    .select('id')
    .single()

  if (otError || !ot) {
    return NextResponse.json({ error: otError?.message ?? 'Error al crear OT' }, { status: 500 })
  }

  if (Array.isArray(items) && items.length > 0) {
    const otItems = items.map((item: {
      descripcion: string; cantidad: number
      ancho: number | null; alto: number | null; precio: number
    }, idx: number) => {
      const sub = item.ancho != null && item.alto != null
        ? item.precio * item.ancho * item.alto * item.cantidad
        : item.precio * item.cantidad
      return {
        ot_id:           ot.id,
        descripcion:     item.descripcion,
        cantidad:        item.cantidad,
        ancho:           item.ancho ?? null,
        alto:            item.alto ?? null,
        precio_unitario: Math.round(item.precio),
        subtotal:        Math.round(sub),
        orden:           idx,
      }
    })
    await supabase.from('ot_items').insert(otItems)
  }

  revalidatePath('/ot')
  return NextResponse.json({ id: ot.id })
}
