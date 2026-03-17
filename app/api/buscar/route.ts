import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = await createClient()

  const [
    { data: cotizaciones },
    { data: clientes },
    { data: ots },
    { data: cotizacionItemMatches },
  ] = await Promise.all([
    supabase
      .from('cotizaciones')
      .select('id, numero, estado, clientes(nombre)')
      .or(`numero.ilike.%${q}%,asunto.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('clientes')
      .select('id, nombre, rut, email')
      .or(`nombre.ilike.%${q}%,rut.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('ordenes_trabajo')
      .select('id, numero, estado, clientes(nombre)')
      .or(`numero.ilike.%${q}%`)
      .limit(5),
    // Buscar cotizaciones cuyos ítems tengan descripción que coincida
    supabase
      .from('cotizacion_items')
      .select('cotizacion_id, descripcion')
      .ilike('descripcion', `%${q}%`)
      .limit(10),
  ])

  // Deduplicar cotizaciones que ya aparecen por número
  const cotizacionIdsYaEncontradas = new Set((cotizaciones ?? []).map((c) => c.id))

  // IDs de cotizaciones encontradas por contenido de ítems
  const cotizacionIdsPorItems = Array.from(
    new Set((cotizacionItemMatches ?? []).map((i) => i.cotizacion_id))
  ).filter((cid) => !cotizacionIdsYaEncontradas.has(cid))

  // Cargar datos de cotizaciones encontradas por ítems
  let cotizacionesPorItems: Array<{ id: string; numero: string; estado: string; clientes: { nombre: string }[] | { nombre: string } | null }> = []
  if (cotizacionIdsPorItems.length > 0) {
    const { data } = await supabase
      .from('cotizaciones')
      .select('id, numero, estado, clientes(nombre)')
      .in('id', cotizacionIdsPorItems.slice(0, 5))
    cotizacionesPorItems = (data ?? []) as typeof cotizacionesPorItems
  }

  const todasCotizaciones = [...(cotizaciones ?? []), ...cotizacionesPorItems]

  const results = [
    ...todasCotizaciones.map((c) => {
      const cliente = Array.isArray(c.clientes) ? c.clientes[0] : c.clientes
      const itemDesc = cotizacionItemMatches?.find((i) => i.cotizacion_id === c.id)?.descripcion
      return {
        type: 'cotizacion' as const,
        id: c.id,
        label: c.numero,
        sub: (cliente as { nombre?: string } | null)?.nombre ?? (itemDesc ? `ítem: ${itemDesc}` : ''),
        href: `/cotizaciones/${c.id}`,
        estado: c.estado,
      }
    }),
    ...(ots ?? []).map((o) => {
      const cliente = Array.isArray(o.clientes) ? o.clientes[0] : o.clientes
      return {
        type: 'ot' as const,
        id: o.id,
        label: o.numero,
        sub: (cliente as { nombre?: string } | null)?.nombre ?? '',
        href: `/ot/${o.id}`,
        estado: o.estado,
      }
    }),
    ...(clientes ?? []).map((c) => ({
      type: 'cliente' as const,
      id: c.id,
      label: c.nombre,
      sub: c.rut ?? c.email ?? '',
      href: `/clientes/${c.id}`,
      estado: null,
    })),
  ]

  return NextResponse.json(results)
}
