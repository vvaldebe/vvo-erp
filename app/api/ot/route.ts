import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generarNumeroOT } from '@/lib/utils/numeracion'

async function nextNumeroOT(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
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

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { cliente_id, maquina_id, fecha_entrega, notas_produccion, subtotal, total, items } = body

  // Generar número OT server-side (MAX-based para evitar duplicados)
  const numero = await nextNumeroOT(supabase)

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
    const { error: itemsError } = await supabase.from('ot_items').insert(otItems)
    if (itemsError) {
      // Revertir: eliminar la OT creada para no dejar datos inconsistentes
      await supabase.from('ordenes_trabajo').delete().eq('id', ot.id)
      return NextResponse.json({ error: 'Error al guardar ítems: ' + itemsError.message }, { status: 500 })
    }
  }

  revalidatePath('/ot')
  return NextResponse.json({ id: ot.id })
}
